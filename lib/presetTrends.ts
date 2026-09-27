import { presetSeeds } from "./presetCatalog";
import type { RisingHit, RisingTrend } from "./trends";

const MAKEUP_TAGS = ["glassskin", "lipoil", "cleangirl", "dewymakeup", "softglam"];

export function presetRisingTrends(): {
  suggestions: string[];
  breakouts: RisingHit[];
  chart: RisingHit[];
  trends: RisingTrend[];
  notes: string[];
} {
  const makeup = presetSeeds().filter((s) => s.platform === "tiktok" && s.makeupTrend);
  const chart: RisingHit[] = makeup.slice(0, 24).map((s) => {
    const views = s.views[0];
    const followers = s.followers;
    return {
      videoId: `${s.handle}-trend`,
      videoTitle: s.titles[0],
      videoUrl: `https://www.tiktok.com/@${s.handle}`,
      publishedAt: new Date(Date.now() - s.daysAgo[0] * 86_400_000).toISOString(),
      views,
      likes: s.likes[0],
      channelId: s.handle,
      channelTitle: s.name,
      channelUrl: `https://www.tiktok.com/@${s.handle}`,
      followers,
      country: s.country,
      market: s.country,
      viewsPerSub: followers > 0 ? views / followers : views,
      breakout: views >= followers * 4,
      tags: ["glassskin"],
    };
  });
  const byTag = MAKEUP_TAGS.map((label, idx) => ({
    label,
    hits: chart.filter((_, i) => i % MAKEUP_TAGS.length === idx),
  }));
  return {
    suggestions: MAKEUP_TAGS,
    breakouts: chart.filter((h) => h.breakout).sort((a, b) => b.viewsPerSub - a.viewsPerSub),
    chart,
    trends: byTag,
    notes: [
      "Makeup trend pack is staged demo data (glass skin / lip oil / clean girl) — not TikTok Creative Center.",
      "Handles are fictional csdemo_* accounts so you can still shortlist when live TikTok search is empty.",
    ],
  };
}
