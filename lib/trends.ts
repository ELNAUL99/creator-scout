import { getMarket } from "./markets";
import { dictionaryTerms, isNicheId, nichesFromBrief, type NicheId } from "./niches";
import { listLensCaptures } from "./lensStore";
import { hitsFromSearchItems, searchApiConfigured, searchIndexedWeb } from "./webSearch";

export type RisingHit = {
  videoId: string;
  videoTitle: string;
  videoUrl: string;
  publishedAt: string;
  views: number;
  likes: number;
  channelId: string;
  channelTitle: string;
  channelUrl: string;
  followers: number;
  country: string | null;
  market: string;
  viewsPerSub: number;
  breakout: boolean;
  tags: string[];
  needsLens: boolean;
};

export type RisingTrend = {
  label: string;
  hits: RisingHit[];
};

export type RisingResponse = {
  createdAt: string;
  apiUnitsUsed: number;
  notes: string[];
  breakouts: RisingHit[];
  chart: RisingHit[];
  trends: RisingTrend[];
  error?: string;
};

function isBreakout(followers: number, views: number) {
  if (views <= 0) return false;
  if (followers <= 0) return views >= 80_000;
  if (followers < 10_000 && views >= followers * 8) return true;
  if (followers < 50_000 && views >= followers * 5) return true;
  return false;
}

function normHandle(h: string) {
  return h.replace(/^@/, "").toLowerCase();
}

export async function runRisingTrends(
  markets: string[],
  nicheIds: string[],
  query: string,
): Promise<RisingResponse> {
  const notes: string[] = [
    "TikTok-only. There is no official TikTok live-trend API on Login Kit — we do not scrape TikTok search.",
    "Handles come from Google/Brave site:tiktok.com for this sound/hashtag/topic. Views vs followers appear when Scout Lens has already scored that profile.",
  ];

  if (!searchApiConfigured()) {
    return {
      createdAt: new Date().toISOString(),
      apiUnitsUsed: 0,
      notes,
      breakouts: [],
      chart: [],
      trends: [],
      error:
        "TikTok rising needs GOOGLE_CSE_KEY + GOOGLE_CSE_CX (or Brave). Connect TikTok still cannot read other people’s videos.",
    };
  }

  const fromIds = nicheIds.filter(isNicheId) as NicheId[];
  const niches = fromIds.length ? fromIds : nichesFromBrief(query || "gaming");
  const topic = query.trim().replace(/^#/, "");
  const chart: RisingHit[] = [];
  const seen = new Set<string>();
  let provider = "search API";

  for (const code of markets.slice(0, 4)) {
    const market = getMarket(code);
    const term = topic || dictionaryTerms(niches, market.language)[0] || "fyp";
    const q = `site:tiktok.com ${topic ? `#${term} OR "${term}"` : `"${term}"`} ${market.name}`;
    const found = await searchIndexedWeb(q);
    if (found.provider) provider = found.provider;
    const hits = hitsFromSearchItems(found.items).filter((h) => h.platform === "tiktok");
    for (const hit of hits) {
      const handle = normHandle(hit.handle);
      const key = `${code}:${handle}`;
      if (seen.has(key)) continue;
      seen.add(key);
      chart.push({
        videoId: key,
        videoTitle: hit.snippet.slice(0, 160) || `@${handle}`,
        videoUrl: hit.url,
        publishedAt: "",
        views: 0,
        likes: 0,
        channelId: handle,
        channelTitle: `@${handle}`,
        channelUrl: `https://www.tiktok.com/@${handle}`,
        followers: 0,
        country: null,
        market: code,
        viewsPerSub: 0,
        breakout: false,
        tags: [term],
        needsLens: true,
      });
    }
  }

  const lens = (await listLensCaptures()).filter((r) => r.platform === "tiktok");
  const byHandle = new Map(lens.map((r) => [normHandle(r.handle), r]));
  for (const row of chart) {
    const cap = byHandle.get(normHandle(row.channelId));
    if (!cap) continue;
    row.followers = cap.followers;
    row.views = cap.views;
    row.likes = cap.likes;
    row.channelTitle = cap.name || row.channelTitle;
    row.viewsPerSub = cap.followers > 0 ? cap.views / cap.followers : cap.views;
    row.breakout = isBreakout(cap.followers, cap.views);
    row.needsLens = false;
    if (cap.url) row.videoUrl = cap.url;
  }

  const topicLower = topic.toLowerCase();
  for (const cap of lens) {
    const handle = normHandle(cap.handle);
    if (chart.some((h) => normHandle(h.channelId) === handle)) continue;
    const blob = `${cap.bio} ${cap.captions.join(" ")} ${cap.name}`.toLowerCase();
    if (topicLower && !blob.includes(topicLower)) continue;
    const breakout = isBreakout(cap.followers, cap.views);
    if (!breakout && !topicLower) continue;
    chart.push({
      videoId: `lens:${handle}`,
      videoTitle: cap.captions[0] || cap.bio || cap.name,
      videoUrl: cap.url || `https://www.tiktok.com/@${handle}`,
      publishedAt: cap.savedAt,
      views: cap.views,
      likes: cap.likes,
      channelId: handle,
      channelTitle: cap.name || `@${handle}`,
      channelUrl: `https://www.tiktok.com/@${handle}`,
      followers: cap.followers,
      country: cap.country,
      market: markets[0] ?? "",
      viewsPerSub: cap.followers > 0 ? cap.views / cap.followers : cap.views,
      breakout,
      tags: topic ? [topic] : [],
      needsLens: false,
    });
  }

  notes.push(`TikTok handles from ${provider} site: queries. Open a result in Opera with Scout Lens to fill views and followers.`);
  if (topic) notes.push(`Topic: #${topic.replace(/^#/, "")}`);

  const breakouts = chart.filter((h) => h.breakout).sort((a, b) => b.viewsPerSub - a.viewsPerSub);
  const grouped = new Map<string, RisingHit[]>();
  for (const h of chart) {
    const label = h.tags[0] || "tiktok";
    const list = grouped.get(label) ?? [];
    list.push(h);
    grouped.set(label, list);
  }
  const trends = [...grouped.entries()].map(([label, hits]) => ({ label, hits }));

  return {
    createdAt: new Date().toISOString(),
    apiUnitsUsed: 0,
    notes,
    breakouts,
    chart,
    trends,
  };
}
