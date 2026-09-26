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

export function instagramConfigured() {
  return Boolean((process.env.INSTAGRAM_GRAPH_TOKEN ?? "").trim() && (process.env.INSTAGRAM_BUSINESS_ID ?? "").trim());
}

export async function businessDiscovery(username: string): Promise<IgDiscovery | null> {
  const token = (process.env.INSTAGRAM_GRAPH_TOKEN ?? "").trim();
  const igUser = (process.env.INSTAGRAM_BUSINESS_ID ?? "").trim();
  if (!token || !igUser) return null;
  const fields = `business_discovery.username(${username}){followers_count,media_count,name,biography,media.limit(5){caption,like_count,comments_count,timestamp,permalink}}`;
  const url = new URL(`https://graph.facebook.com/v21.0/${igUser}`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", token);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    business_discovery?: {
      username?: string;
      name?: string;
      biography?: string;
      followers_count?: number;
      media_count?: number;
      media?: { data?: { caption?: string; like_count?: number; comments_count?: number }[] };
    };
  };
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
