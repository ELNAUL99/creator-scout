import { presetRisingTrends } from "./presetTrends";

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

export async function runRisingTrends(
  _markets: string[],
  nicheIds: string[],
  _query: string,
): Promise<RisingResponse> {
  const staged = presetRisingTrends(nicheIds);
  return {
    createdAt: new Date().toISOString(),
    apiUnitsUsed: 0,
    notes: staged.notes,
    suggestions: staged.suggestions,
    breakouts: staged.breakouts,
    chart: staged.chart,
    trends: staged.trends,
  };
}
