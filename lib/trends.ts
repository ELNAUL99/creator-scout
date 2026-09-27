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

export type TrendKind = "hashtag" | "sound" | "topic";

export type RisingTrend = {
  label: string;
  kind: TrendKind;
  /** Summed views for this tag/sound. 0 = unknown (TikTok does not give other accounts’ views). */
  views: number;
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

type TopicHint = { label: string; views: number; kind: TrendKind };

function mergeTrend(into: RisingTrend[], next: RisingTrend) {
  const key = next.label.toLowerCase();
  const existing = into.find((t) => t.label.toLowerCase() === key);
  if (!existing) {
    into.push({ ...next, label: next.label.toLowerCase() });
    return;
  }
  existing.views = Math.max(existing.views, next.views);
  existing.hits = [...existing.hits, ...next.hits];
  if (next.kind === "sound") existing.kind = "sound";
}

async function suggestFiveTopics(nicheIds: string[]): Promise<{ topics: TopicHint[]; units: number; note: string }> {
  const key = (process.env.YOUTUBE_API_KEY ?? "").trim();
  if (!key) {
    const fromIds = nicheIds.filter(isNicheId) as NicheId[];
    const niches = fromIds.length ? fromIds : nichesFromBrief("gaming");
    return {
      topics: dictionaryTerms(niches, "en")
        .slice(0, 5)
        .map((label) => ({ label, views: 0, kind: "topic" as const })),
      units: 0,
      note: "No YouTube key — suggested niche words instead of a live chart.",
    };
  }
  let units = 0;
  const byTag = new Map<string, { views: number; kind: TrendKind }>();
  for (const cat of [undefined, "10"] as const) {
    const pop = await fetchMostPopular({
      key,
      regionCode: "US",
      maxResults: 25,
      videoCategoryId: cat,
    });
    units += pop.units;
    const kind: TrendKind = cat === "10" ? "sound" : "hashtag";
    for (const v of pop.items) {
      const tags = v.tags.length ? v.tags : v.title.split(/[\s#]+/);
      for (const raw of tags) {
        const tag = raw.replace(/^#/, "").trim();
        if (!scoreTag(tag)) continue;
        const k = tag.toLowerCase();
        const prev = byTag.get(k) ?? { views: 0, kind };
        prev.views += v.views;
        if (kind === "sound") prev.kind = "sound";
        byTag.set(k, prev);
      }
    }
  }
  const topics = [...byTag.entries()]
    .sort((a, b) => b[1].views - a[1].views)
    .slice(0, 8)
    .map(([label, v]) => ({ label, views: v.views, kind: v.kind }));
  return {
    topics: topics.length ? topics : [{ label: "viral", views: 0, kind: "hashtag" }],
    units,
    note: "Hot bubbles are hashtags and sounds from YouTube’s live mostPopular chart (US, including Music). View counts under each bubble are those chart videos — not TikTok Creative Center.",
  };
}

export async function runRisingTrends(
  _markets: string[],
  nicheIds: string[],
  _query: string,
): Promise<RisingResponse> {
  const notes: string[] = [
    "TikTok-only rising. Hot search is small bubbles (hashtag or sound). Views under a bubble are attributed chart/demo views — Login Kit cannot read other accounts’ TikTok views.",
  ];

  const suggested = await suggestFiveTopics(nicheIds);
  notes.push(suggested.note);

  const staged = presetRisingTrends();
  const topicLabels = suggested.topics.map((t) => t.label);

  function seedTrends(): RisingTrend[] {
    const list: RisingTrend[] = [];
    for (const t of suggested.topics) {
      mergeTrend(list, { label: t.label, kind: t.kind, views: t.views, hits: [] });
    }
    for (const t of staged.trends) mergeTrend(list, t);
    return list.sort((a, b) => b.views - a.views);
  }

  if (!searchApiConfigured()) {
    const trends = seedTrends();
    return {
      createdAt: new Date().toISOString(),
      apiUnitsUsed: suggested.units,
      notes: [...notes, ...staged.notes],
      suggestions: trends.map((t) => t.label).slice(0, 12),
      breakouts: staged.breakouts,
      chart: staged.chart,
      trends,
    };
  }

  const chart: RisingHit[] = [];
  const seen = new Set<string>();
  let provider = "search API";

  for (const topic of topicLabels) {
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
  const trends = seedTrends();
  for (const h of chart) {
    const label = (h.tags[0] || "tiktok").toLowerCase();
    mergeTrend(trends, {
      label,
      kind: "hashtag",
      views: h.views,
      hits: [h],
    });
  }
  trends.sort((a, b) => b.views - a.views);

  return {
    createdAt: new Date().toISOString(),
    apiUnitsUsed: suggested.units,
    notes,
    suggestions: trends.map((t) => t.label).slice(0, 12),
    breakouts,
    chart,
    trends,
  };
}
