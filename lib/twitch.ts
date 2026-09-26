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
};

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
 * this returns channel identity + language + live status, but NOT follower counts
 * (Twitch requires a broadcaster/moderator user token for follower totals).
 */
export async function searchTwitchChannels(query: string, first = 20): Promise<TwitchChannel[]> {
  const token = await getAppToken();
  if (!token || !query.trim()) return [];
  const url = new URL("https://api.twitch.tv/helix/search/channels");
  url.searchParams.set("query", query.trim());
  url.searchParams.set("first", String(Math.min(Math.max(first, 1), 100)));
  const res = await fetch(url, {
    headers: {
      "Client-Id": (process.env.TWITCH_CLIENT_ID ?? "").trim(),
      Authorization: `Bearer ${token}`,
    },
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
  return (data.data ?? [])
    .filter((c) => c.broadcaster_login)
    .map((c) => ({
      id: c.id ?? c.broadcaster_login!,
      login: c.broadcaster_login!,
      displayName: c.display_name || c.broadcaster_login!,
      gameName: c.game_name ?? "",
      language: (c.broadcaster_language ?? "").toLowerCase(),
      isLive: Boolean(c.is_live),
      title: c.title ?? "",
      thumbnailUrl: c.thumbnail_url ?? "",
    }));
}
