import { dictionaryTerms, isNicheId, nichesFromBrief, type NicheId } from "./niches";
import { presetRisingTrends } from "./presetTrends";
import { hitsFromSearchItems, searchApiConfigured, searchIndexedWeb } from "./webSearch";
import { fetchMostPopular } from "./youtube";

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
};

export type RisingTrend = {
  label: string;
  hits: RisingHit[];
};

export type RisingResponse = {
  createdAt: string;
  apiUnitsUsed: number;
  notes: string[];
  suggestions: string[];
  breakouts: RisingHit[];
  chart: RisingHit[];
  trends: RisingTrend[];
  error?: string;
};

const STOP = new Set(
  "official video audio lyrics hd mv the and for you your with this that from feat ft vs officialmusic musicvideo shorts fyp foryou tiktok youtube".split(
    " ",
  ),
);

function normHandle(h: string) {
  return h.replace(/^@/, "").toLowerCase();
}

function scoreTag(tag: string) {
  const t = tag.trim();
  if (t.length < 2 || t.length > 40) return false;
  if (STOP.has(t.toLowerCase())) return false;
  if (/^\d+$/.test(t)) return false;
  return true;
}

async function suggestFiveTopics(nicheIds: string[]): Promise<{ topics: string[]; units: number; note: string }> {
  const key = (process.env.YOUTUBE_API_KEY ?? "").trim();
  if (!key) {
    const fromIds = nicheIds.filter(isNicheId) as NicheId[];
    const niches = fromIds.length ? fromIds : nichesFromBrief("gaming");
    return {
      topics: dictionaryTerms(niches, "en").slice(0, 5),
      units: 0,
      note: "No YouTube key — suggested niche words instead of a live chart.",
    };
  }
  let units = 0;
  const counts = new Map<string, number>();
  for (const cat of [undefined, "10"]) {
    const pop = await fetchMostPopular({
      key,
      regionCode: "US",
      maxResults: 25,
      videoCategoryId: cat,
    });
    units += pop.units;
    for (const v of pop.items) {
      const tags = v.tags.length ? v.tags : v.title.split(/[\s#]+/);
      for (const raw of tags) {
        const tag = raw.replace(/^#/, "").trim();
        if (!scoreTag(tag)) continue;
        const k = tag.toLowerCase();
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
  }
  const topics = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t)
    .slice(0, 5);
  return {
    topics: topics.length ? topics : ["fyp", "viral", "trending"],
    units,
    note: "Top 5 topics from YouTube’s live mostPopular chart (US, including Music). Used as TikTok site: queries — not TikTok Creative Center.",
  };
}

export async function runRisingTrends(
  _markets: string[],
  nicheIds: string[],
  _query: string,
): Promise<RisingResponse> {
  const notes: string[] = [
    "TikTok-only rising. We suggest the five hottest topics from the live video chart, then find public TikTok handles already indexed for those tags. Login Kit cannot read other accounts’ views.",
  ];

  const suggested = await suggestFiveTopics(nicheIds);
  notes.push(suggested.note);

  const staged = presetRisingTrends();

  if (!searchApiConfigured()) {
    return {
      createdAt: new Date().toISOString(),
      apiUnitsUsed: suggested.units,
      notes: [...notes, ...staged.notes],
      suggestions: staged.suggestions,
      breakouts: staged.breakouts,
      chart: staged.chart,
      trends: staged.trends,
    };
  }

  const chart: RisingHit[] = [];
  const seen = new Set<string>();
  let provider = "search API";

  for (const topic of suggested.topics) {
    const q = `site:tiktok.com "#${topic}" OR "${topic}"`;
    const found = await searchIndexedWeb(q);
    if (found.provider) provider = found.provider;
    const hits = hitsFromSearchItems(found.items).filter((h) => h.platform === "tiktok");
    for (const hit of hits.slice(0, 8)) {
      const handle = normHandle(hit.handle);
      const key = `${topic}:${handle}`;
      if (seen.has(handle)) continue;
      seen.add(handle);
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
        market: "WW",
        viewsPerSub: 0,
        breakout: false,
        tags: [topic],
      });
    }
  }
  notes.push(`TikTok handles from ${provider} for the five suggested topics.`);
  notes.push(...staged.notes);

  for (const h of staged.chart) {
    if (seen.has(normHandle(h.channelId))) continue;
    seen.add(normHandle(h.channelId));
    chart.push(h);
  }

  const breakouts = chart.filter((h) => h.breakout).sort((a, b) => b.viewsPerSub - a.viewsPerSub);
  const grouped = new Map<string, RisingHit[]>();
  for (const topic of [...suggested.topics, ...staged.suggestions]) grouped.set(topic, []);
  for (const h of chart) {
    const label = h.tags[0] || "tiktok";
    const list = grouped.get(label) ?? [];
    list.push(h);
    grouped.set(label, list);
  }
  const trends = [...grouped.entries()].map(([label, hits]) => ({ label, hits }));

  return {
    createdAt: new Date().toISOString(),
    apiUnitsUsed: suggested.units,
    notes,
    suggestions: [...new Set([...staged.suggestions, ...suggested.topics])].slice(0, 8),
    breakouts,
    chart,
    trends,
  };
}
