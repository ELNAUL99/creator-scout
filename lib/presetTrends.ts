import { presetSeeds, type PresetSeed } from "./presetCatalog";
import type { RisingHit, RisingTrend } from "./trends";

const HASHTAGS = ["glassskin", "lipoil", "cleangirl", "dewymakeup", "softglam"];
const SOUNDS = ["oh no sped up", "original sound", "aesthetic beat"];
const CREATORS_PER_TOPIC = 5;

function toHit(s: PresetSeed, tag: string, kind: "trend" | "sound"): RisingHit {
  const views = s.views[0];
  return {
    videoId: `${s.handle}-${kind}`,
    videoTitle: s.titles[0],
    videoUrl: `https://www.tiktok.com/@${s.handle}`,
    publishedAt: new Date(Date.now() - s.daysAgo[0] * 86_400_000).toISOString(),
    views,
    likes: s.likes[0],
    channelId: s.handle,
    channelTitle: s.name,
    channelUrl: `https://www.tiktok.com/@${s.handle}`,
    followers: s.followers,
    country: s.country,
    market: s.country,
    viewsPerSub: s.followers > 0 ? views / s.followers : views,
    breakout: views >= s.followers * 4,
    tags: [tag],
  };
}

export function presetRisingTrends(): {
  suggestions: string[];
  breakouts: RisingHit[];
  chart: RisingHit[];
  trends: RisingTrend[];
  notes: string[];
} {
  const pool = presetSeeds().filter((s) => s.platform === "tiktok" && (s.makeupTrend || s.niches.includes("beauty")));
  let cursor = 0;
  function take(n: number) {
    const slice = pool.slice(cursor, cursor + n);
    cursor += n;
    return slice;
  }

  const hashTrends: RisingTrend[] = HASHTAGS.map((label) => {
    const hits = take(CREATORS_PER_TOPIC).map((s) => toHit(s, label, "trend"));
    return {
      label,
      kind: "hashtag" as const,
      views: hits.reduce((sum, h) => sum + h.views, 0),
      hits,
    };
  });

  const soundTrends: RisingTrend[] = SOUNDS.map((label) => {
    const hits = take(CREATORS_PER_TOPIC).map((s) => toHit(s, label, "sound"));
    return {
      label,
      kind: "sound" as const,
      views: hits.reduce((sum, h) => sum + h.views, 0),
      hits,
    };
  });

  const chart = [...hashTrends, ...soundTrends].flatMap((t) => t.hits);
  return {
    suggestions: [...HASHTAGS, ...SOUNDS],
    breakouts: chart.filter((h) => h.breakout).sort((a, b) => b.viewsPerSub - a.viewsPerSub),
    chart,
    trends: [...hashTrends, ...soundTrends],
    notes: [
      "Makeup hashtag and sound bubbles use staged demo view totals — not TikTok Creative Center.",
      "Each bubble lists five labelled demo TikToks. Handles are fictional csdemo_* accounts.",
    ],
  };
}
