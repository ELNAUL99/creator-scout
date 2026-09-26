import type { BrandProfile, ScoreComponents, SizeTier } from "./types";

export const TIER_BENCHMARK: Record<SizeTier, number> = {
  nano: 0.08,
  micro: 0.05,
  mid: 0.035,
  macro: 0.02,
};

export const DEFAULT_WEIGHTS = {
  nicheRelevance: 30,
  audienceMatch: 25,
  engagementQuality: 25,
  brandFit: 10,
  recentActivity: 10,
};

export function sizeTier(followers: number): SizeTier {
  if (followers < 10_000) return "nano";
  if (followers < 50_000) return "micro";
  if (followers < 250_000) return "mid";
  return "macro";
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function haystack(parts: (string | null | undefined)[]) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function nicheRelevanceScore(briefTerms: string[], text: string, llmStyle?: number | null) {
  const t = text.toLowerCase();
  const hits = briefTerms.filter((term) => term && t.includes(term.toLowerCase()));
  const distinct = [...new Set(hits)];
  const rule = distinct.length === 0 ? 25 : Math.min(100, 40 + 15 * distinct.length);
  if (typeof llmStyle === "number") return clamp(Math.round(rule * 0.5 + llmStyle * 0.5));
  return clamp(rule);
}

export function audienceMatchScore(opts: {
  channelCountry: string | null;
  targetMarket: string;
  contentInMarketLanguage: boolean;
}) {
  if (!opts.targetMarket || opts.targetMarket === "WW") return 70;
  let score = 30;
  if (!opts.channelCountry) score = 60;
  else if (opts.channelCountry.toUpperCase() === opts.targetMarket.toUpperCase()) score = 100;
  if (opts.contentInMarketLanguage) score = Math.max(score, 85);
  return clamp(score);
}

export function engagementQualityScore(opts: {
  likes: number;
  comments: number;
  views: number;
  followers: number;
  tier: SizeTier;
}) {
  if (opts.views <= 0) return 20;
  const er = (opts.likes + opts.comments) / opts.views;
  const bench = TIER_BENCHMARK[opts.tier];
  let score = (er / bench) * 70;
  const commentLike = opts.likes > 0 ? opts.comments / opts.likes : 0;
  if (commentLike >= 0.08) score += 20;
  else if (commentLike >= 0.04) score += 10;
  const viewShare = opts.followers > 0 ? opts.views / opts.followers : 1;
  if (viewShare < 0.01) score -= 35;
  return clamp(score);
}

export function brandFitScore(text: string, brand: BrandProfile) {
  const t = text.toLowerCase();
  let score = 55;
  const goodHits = brand.goodFitWords.filter((w) => t.includes(w.toLowerCase())).length;
  score += Math.min(40, goodHits * 10);
  const pitchBits = brand.pitch
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((w) => w.length > 3);
  const pitchHits = pitchBits.filter((w) => t.includes(w)).length;
  score += Math.min(20, pitchHits * 4);
  if (brand.competitors.some((c) => t.includes(c.toLowerCase()))) score -= 45;
  if (brand.riskWords.some((c) => t.includes(c.toLowerCase()))) score -= 60;
  return clamp(score);
}

export function recentActivityScore(lastUpload: Date | null, now = new Date()) {
  if (!lastUpload) return 20;
  const days = (now.getTime() - lastUpload.getTime()) / 86_400_000;
  if (days <= 14) return 100;
  if (days <= 30) return 80;
  if (days <= 90) return 50;
  return 20;
}

export function blendFit(components: ScoreComponents, weights = DEFAULT_WEIGHTS) {
  const num =
    weights.nicheRelevance * components.nicheRelevance +
    weights.audienceMatch * components.audienceMatch +
    weights.engagementQuality * components.engagementQuality +
    weights.brandFit * components.brandFit +
    weights.recentActivity * components.recentActivity;
  const den = Object.values(weights).reduce((a, b) => a + b, 0);
  return Math.round(num / den);
}

export function detectFlags(opts: {
  text: string;
  brand: BrandProfile;
  madeForKids: boolean;
  views: number;
  followers: number;
}) {
  const flags: string[] = [];
  const t = opts.text.toLowerCase();
  if (opts.brand.competitors.some((c) => t.includes(c.toLowerCase()))) flags.push("Mentions a competitor");
  if (opts.brand.riskWords.some((c) => t.includes(c.toLowerCase()))) flags.push("Brand-risk content");
  if (opts.madeForKids) flags.push("Made for kids / under-18 audience");
  if (opts.followers > 0 && opts.views < opts.followers * 0.01) flags.push("Views far below subscribers");
  return flags;
}

export function suggestedDeal(tier: SizeTier, brandFit: number, prenew = false) {
  if ((tier === "nano" || tier === "micro") && brandFit >= 75) {
    return prenew ? "Product to review + affiliate code" : "Product seed + affiliate code";
  }
  if (tier === "nano" || tier === "micro") {
    return prenew ? "Affiliate code + trade-in campaign" : "Affiliate code + seeded product";
  }
  if (tier === "mid") return "Paid video + affiliate code";
  return "Paid integration; test one post first";
}

export function scoreCreator(input: {
  briefTerms: string[];
  text: string;
  channelCountry: string | null;
  targetMarket: string;
  contentInMarketLanguage: boolean;
  likes: number;
  comments: number;
  views: number;
  followers: number;
  lastUpload: Date | null;
  madeForKids: boolean;
  brand: BrandProfile;
  llmFit?: number | null;
}) {
  const tier = sizeTier(input.followers);
  const components: ScoreComponents = {
    nicheRelevance: nicheRelevanceScore(input.briefTerms, input.text, input.llmFit ?? null),
    audienceMatch: audienceMatchScore({
      channelCountry: input.channelCountry,
      targetMarket: input.targetMarket,
      contentInMarketLanguage: input.contentInMarketLanguage,
    }),
    engagementQuality: engagementQualityScore({
      likes: input.likes,
      comments: input.comments,
      views: input.views,
      followers: input.followers,
      tier,
    }),
    brandFit: brandFitScore(input.text, input.brand) - (input.madeForKids ? 30 : 0),
    recentActivity: recentActivityScore(input.lastUpload),
  };
  components.brandFit = Math.max(0, Math.min(100, components.brandFit));
  const fit = blendFit(components);
  const flags = detectFlags({
    text: input.text,
    brand: input.brand,
    madeForKids: input.madeForKids,
    views: input.views,
    followers: input.followers,
  });
  const hiddenGem = fit >= 70 && input.followers < 50_000 && flags.length === 0;
  const er = input.views > 0 ? (input.likes + input.comments) / input.views : 0;
  return {
    tier,
    components,
    fit,
    flags,
    hiddenGem,
    engagementRate: er,
    suggestedDeal: suggestedDeal(
      tier,
      components.brandFit,
      input.brand.name.trim().toLowerCase() === "prenew",
    ),
  };
}
