export function twitchConfigured() {
  return Boolean(
    (process.env.TWITCH_CLIENT_ID ?? "").trim() && (process.env.TWITCH_CLIENT_SECRET ?? "").trim(),
  );
}

export type TwitchChannel = {
  id: string;
  login: string;
  displayName: string;
  gameName: string;
  language: string; // broadcaster_language, e.g. "en", "vi", "pt"
  isLive: boolean;
  title: string;
  thumbnailUrl: string;
  lastVideoTitle?: string;
  avgViews: number;
  peakLiveViewers: number;
  videoUrl?: string;
};

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mean(xs: number[]) {
  if (!xs.length) return 0;
  return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
}

function titleOf(row: Record<string, unknown>, fallback: string) {
  const title = row.title;
  return typeof title === "string" && title.trim() ? title.trim() : fallback;
}

function helixHeaders(token: string) {
  return {
    "Client-Id": (process.env.TWITCH_CLIENT_ID ?? "").trim(),
    Authorization: `Bearer ${token}`,
  };
}

async function helixList(
  token: string,
  path: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>[]> {
  const url = new URL(`https://api.twitch.tv/helix/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: helixHeaders(token), cache: "no-store" });
  if (!res.ok) {
    console.error(`twitch: ${path} failed`, res.status, await res.text().catch(() => ""));
    return [];
  }
  const data = (await res.json()) as { data?: Record<string, unknown>[] };
  return data.data ?? [];
}

async function fetchLiveViewers(token: string, userIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const ids = [...new Set(userIds.filter(Boolean))];
  for (let i = 0; i < ids.length; i += 100) {
    const url = new URL("https://api.twitch.tv/helix/streams");
    for (const id of ids.slice(i, i + 100)) url.searchParams.append("user_id", id);
    const res = await fetch(url, { headers: helixHeaders(token), cache: "no-store" });
    if (!res.ok) {
      console.error("twitch: streams failed", res.status, await res.text().catch(() => ""));
      continue;
    }
    const data = (await res.json()) as { data?: { user_id?: string; viewer_count?: number }[] };
    for (const s of data.data ?? []) {
      if (s.user_id) map.set(s.user_id, num(s.viewer_count));
    }
  }
  return map;
}

async function enrichChannelsWithContent(token: string, channels: TwitchChannel[]): Promise<TwitchChannel[]> {
  const out: TwitchChannel[] = [];
  const chunk = 8;
  for (let i = 0; i < channels.length; i += chunk) {
    const batch = channels.slice(i, i + chunk);
    const rows = await Promise.all(
      batch.map(async (ch) => {
        const videos = await helixList(token, "videos", { user_id: ch.id, first: "20" });
        const clips = videos.length ? [] : await helixList(token, "clips", { broadcaster_id: ch.id, first: "10" });
        if (!ch.isLive && videos.length === 0 && clips.length === 0) return null;
        const vodViews = videos.map((r) => num(r.view_count));
        const clipViews = clips.map((r) => num(r.view_count));
        const pool = vodViews.length ? vodViews : clipViews;
        const first = videos[0] ?? clips[0];
        const videoId = first && typeof first.id === "string" ? first.id : "";
        const videoUrl =
          (typeof first?.url === "string" && first.url) ||
          (videoId ? `https://www.twitch.tv/videos/${videoId}` : undefined);
        return {
          ...ch,
          lastVideoTitle: first ? titleOf(first, "untitled") : ch.title,
          avgViews: mean(pool),
          peakLiveViewers: pool.length ? Math.max(...pool) : 0,
          videoUrl,
        };
      }),
    );
    for (const row of rows) if (row) out.push(row);
  }
  const live = await fetchLiveViewers(
    token,
    out.map((c) => c.id),
  );
  return out.map((ch) => {
    const liveNow = live.get(ch.id) ?? 0;
    return {
      ...ch,
      isLive: liveNow > 0 || ch.isLive,
      peakLiveViewers: liveNow > 0 ? liveNow : ch.peakLiveViewers,
    };
  });
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAppToken(): Promise<string | null> {
  if (!twitchConfigured()) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;
  const body = new URLSearchParams({
    client_id: (process.env.TWITCH_CLIENT_ID ?? "").trim(),
    client_secret: (process.env.TWITCH_CLIENT_SECRET ?? "").trim(),
    grant_type: "client_credentials",
  });
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("twitch: token request failed", res.status, await res.text().catch(() => ""));
    return null;
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.token;
}

/**
 * Search Twitch channels by keyword (Helix Search Channels). App token only —
 * identity + language + live status, not follower counts.
 * Empty personal accounts (not live, no VOD, no clip) are dropped.
 */
export async function searchTwitchChannels(query: string, first = 20): Promise<TwitchChannel[]> {
  const token = await getAppToken();
  if (!token || !query.trim()) return [];
  const want = Math.min(Math.max(first, 1), 100);
  const fetchCount = Math.min(100, Math.max(want * 2, 40));
  const url = new URL("https://api.twitch.tv/helix/search/channels");
  url.searchParams.set("query", query.trim());
  url.searchParams.set("first", String(fetchCount));
  const res = await fetch(url, {
    headers: helixHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("twitch: search failed", res.status, await res.text().catch(() => ""));
    return [];
  }
  const data = (await res.json()) as {
    data?: {
      id?: string;
      broadcaster_login?: string;
      display_name?: string;
      game_name?: string;
      broadcaster_language?: string;
      is_live?: boolean;
      title?: string;
      thumbnail_url?: string;
    }[];
  };
  const mapped = (data.data ?? [])
    .filter((c) => c.id && c.broadcaster_login)
    .map((c) => ({
      id: c.id!,
      login: c.broadcaster_login!,
      displayName: c.display_name || c.broadcaster_login!,
      gameName: c.game_name ?? "",
      language: (c.broadcaster_language ?? "").toLowerCase(),
      isLive: Boolean(c.is_live),
      title: c.title ?? "",
      thumbnailUrl: c.thumbnail_url ?? "",
      avgViews: 0,
      peakLiveViewers: 0,
    }));
  const withContent = await enrichChannelsWithContent(token, mapped);
  return withContent.slice(0, want);
}
