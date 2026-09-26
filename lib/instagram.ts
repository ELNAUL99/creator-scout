export type IgDiscovery = {
  username: string;
  name: string;
  biography: string;
  followers: number;
  mediaCount: number;
  captions: string[];
  likes: number;
  comments: number;
};

export type IgAuth = { token: string; igUserId: string };

export function instagramConfigured() {
  return Boolean((process.env.INSTAGRAM_GRAPH_TOKEN ?? "").trim() && (process.env.INSTAGRAM_BUSINESS_ID ?? "").trim());
}

export function envIgAuth(): IgAuth | null {
  const token = (process.env.INSTAGRAM_GRAPH_TOKEN ?? "").trim();
  const igUserId = (process.env.INSTAGRAM_BUSINESS_ID ?? "").trim();
  if (!token || !igUserId) return null;
  return { token, igUserId };
}

function parseDiscovery(username: string, data: {
  business_discovery?: {
    username?: string;
    name?: string;
    biography?: string;
    followers_count?: number;
    media_count?: number;
    media?: { data?: { caption?: string; like_count?: number; comments_count?: number }[] };
  };
}): IgDiscovery | null {
  const d = data.business_discovery;
  if (!d) return null;
  const posts = d.media?.data ?? [];
  const likes = posts.reduce((a, p) => a + (p.like_count ?? 0), 0);
  const comments = posts.reduce((a, p) => a + (p.comments_count ?? 0), 0);
  return {
    username: d.username ?? username,
    name: d.name ?? username,
    biography: d.biography ?? "",
    followers: d.followers_count ?? 0,
    mediaCount: d.media_count ?? 0,
    captions: posts.map((p) => p.caption ?? "").filter(Boolean),
    likes: posts.length ? Math.round(likes / posts.length) : 0,
    comments: posts.length ? Math.round(comments / posts.length) : 0,
  };
}

/** Public professional IG username lookup. Needs a connected IG business/creator token — not a crawl. */
export async function businessDiscovery(username: string, auth?: IgAuth | null): Promise<IgDiscovery | null> {
  const handle = username.replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "");
  if (!handle) return null;
  const creds = auth ?? envIgAuth();
  if (!creds) return null;
  const fields = `business_discovery.username(${handle}){followers_count,media_count,name,biography,media.limit(5){caption,like_count,comments_count,timestamp,permalink}}`;
  const hosts = [
    `https://graph.instagram.com/v21.0/${creds.igUserId}`,
    `https://graph.facebook.com/v21.0/${creds.igUserId}`,
  ];
  for (const base of hosts) {
    const url = new URL(base);
    url.searchParams.set("fields", fields);
    url.searchParams.set("access_token", creds.token);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) continue;
    const json = (await res.json()) as Parameters<typeof parseDiscovery>[1];
    const parsed = parseDiscovery(handle, json);
    if (parsed) return parsed;
  }
  return null;
}
