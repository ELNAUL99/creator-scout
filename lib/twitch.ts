import { NICHE_TERMS, type NicheId } from "./niches";

export function twitchConfigured() {
  return Boolean(
    (process.env.TWITCH_CLIENT_ID ?? "").trim() && (process.env.TWITCH_CLIENT_SECRET ?? "").trim(),
  );
}

/** Twitch directory categories (English names) per Scout niche — not channel-name keywords. */
const TWITCH_CATEGORIES: Record<NicheId, string[]> = {
  gaming: ["League of Legends", "Minecraft", "VALORANT", "Grand Theft Auto V", "Fortnite"],
  "fps-esports": ["VALORANT", "Counter-Strike", "Call of Duty", "Overwatch 2"],
  "pc-building": ["Science & Technology", "Software and Game Development"],
  "tech-reviews": ["Science & Technology", "Software and Game Development"],
  "budget-second-hand": ["Science & Technology"],
  sustainability: ["Science & Technology", "Talk Shows & Podcasts"],
  beauty: ["Just Chatting", "Art", "ASMR"],
  fitness: ["Sports", "Just Chatting"],
  food: ["Food & Drink"],
  travel: ["Travel & Outdoors"],
  fashion: ["Just Chatting"],
  parenting: ["Just Chatting"],
  "personal-finance": ["Talk Shows & Podcasts", "Just Chatting"],
  "diy-home": ["Science & Technology", "Art"],
  pets: ["Animals, Aquariums, and Zoos", "Just Chatting"],
};

export function twitchCategoryQueries(niches: NicheId[]): string[] {
  const out: string[] = [];
  for (const id of niches) {
    out.push(...(TWITCH_CATEGORIES[id] ?? [NICHE_TERMS[id]?.label ?? "Just Chatting"]));
  }
  return [...new Set(out)].slice(0, 6);
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
 * Niche discovery: resolve Twitch directory categories, then live streams + VODs
 * in those games. Not Helix Search Channels (that matches display names).
 */
export async function discoverTwitchByNiche(opts: {
  queries: string[];
  language?: string;
  first?: number;
}): Promise<TwitchChannel[]> {
  const token = await getAppToken();
  if (!token || !opts.queries.length) return [];
  const want = Math.min(Math.max(opts.first ?? 30, 1), 100);
  const lang = opts.language?.trim().toLowerCase();

  const games: { id: string; name: string }[] = [];
  const seenGame = new Set<string>();
  for (const q of opts.queries) {
    const rows = await helixList(token, "search/categories", { query: q, first: "5" });
    for (const r of rows) {
      const id = typeof r.id === "string" ? r.id : "";
      const name = typeof r.name === "string" ? r.name : "";
      if (!id || seenGame.has(id)) continue;
      seenGame.add(id);
      games.push({ id, name });
      if (games.length >= 5) break;
    }
    if (games.length >= 5) break;
  }
  if (!games.length) return [];

  const byUser = new Map<string, TwitchChannel>();
  for (const game of games) {
    const streamParams: Record<string, string> = { game_id: game.id, first: "40" };
    if (lang) streamParams.language = lang;
    const streams = await helixList(token, "streams", streamParams);
    for (const s of streams) {
      const id = typeof s.user_id === "string" ? s.user_id : "";
      const login = typeof s.user_login === "string" ? s.user_login : "";
      if (!id || !login || byUser.has(id)) continue;
      byUser.set(id, {
        id,
        login,
        displayName: typeof s.user_name === "string" ? s.user_name : login,
        gameName: typeof s.game_name === "string" ? s.game_name : game.name,
        language: typeof s.language === "string" ? s.language.toLowerCase() : lang ?? "",
        isLive: true,
        title: typeof s.title === "string" ? s.title : "",
        thumbnailUrl: typeof s.thumbnail_url === "string" ? s.thumbnail_url : "",
        avgViews: 0,
        peakLiveViewers: num(s.viewer_count),
      });
    }
    if (byUser.size >= want * 2) break;
  }

  if (byUser.size < want) {
    for (const game of games) {
      const videos = await helixList(token, "videos", { game_id: game.id, first: "30", type: "archive" });
      for (const v of videos) {
        const id = typeof v.user_id === "string" ? v.user_id : "";
        const login = typeof v.user_login === "string" ? v.user_login : "";
        if (!id || !login || byUser.has(id)) continue;
        const url = typeof v.url === "string" ? v.url : "";
        byUser.set(id, {
          id,
          login,
          displayName: typeof v.user_name === "string" ? v.user_name : login,
          gameName: game.name,
          language: lang ?? "",
          isLive: false,
          title: titleOf(v, ""),
          thumbnailUrl: "",
          lastVideoTitle: titleOf(v, ""),
          avgViews: num(v.view_count),
          peakLiveViewers: num(v.view_count),
          videoUrl: url || undefined,
        });
      }
      if (byUser.size >= want * 2) break;
    }
  }

  const collected = [...byUser.values()];
  const withLang = await fillBroadcasterLanguage(token, collected);
  const filtered = lang
    ? withLang.filter((c) => !c.language || c.language === lang)
    : withLang;
  return enrichChannelsWithContent(token, filtered.slice(0, Math.max(want * 2, 40))).then((rows) =>
    rows.slice(0, want),
  );
}

async function fillBroadcasterLanguage(token: string, channels: TwitchChannel[]): Promise<TwitchChannel[]> {
  const missing = channels.filter((c) => !c.language);
  if (!missing.length) return channels;
  const map = new Map<string, string>();
  for (let i = 0; i < missing.length; i += 100) {
    const url = new URL("https://api.twitch.tv/helix/channels");
    for (const c of missing.slice(i, i + 100)) url.searchParams.append("broadcaster_id", c.id);
    const res = await fetch(url, { headers: helixHeaders(token), cache: "no-store" });
    if (!res.ok) continue;
    const data = (await res.json()) as { data?: { broadcaster_id?: string; broadcaster_language?: string }[] };
    for (const row of data.data ?? []) {
      if (row.broadcaster_id && row.broadcaster_language) {
        map.set(row.broadcaster_id, row.broadcaster_language.toLowerCase());
      }
    }
  }
  return channels.map((c) => ({
    ...c,
    language: c.language || map.get(c.id) || "",
  }));
}
