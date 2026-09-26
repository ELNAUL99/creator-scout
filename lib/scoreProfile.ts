import { mergeBrand } from "./brand";
import { draftMessage, ruleReasons } from "./messages";
import { scoreCreator } from "./scoring";
import type { Platform, ScoredCreator } from "./types";

export function scoreVisibleProfile(input: {
  name: string;
  platform: Platform;
  bio: string;
  captions: string[];
  followers: number;
  likes: number;
  comments: number;
  views: number;
  country?: string | null;
  market: string;
  language?: string;
  briefTerms: string[];
  source: ScoredCreator["accounts"][0]["source"];
  url: string;
  handle: string;
}) {
  const brand = mergeBrand();
  const text = `${input.bio} ${input.captions.join(" ")}`;
  const scored = scoreCreator({
    briefTerms: input.briefTerms,
    text,
    channelCountry: input.country ?? null,
    targetMarket: input.market,
    contentInMarketLanguage: true,
    likes: input.likes,
    comments: input.comments,
    views: input.views || 1,
    followers: input.followers,
    lastUpload: new Date(),
    madeForKids: false,
    brand,
  });
  const reasons = ruleReasons({
    niche: scored.components.nicheRelevance,
    audience: scored.components.audienceMatch,
    engagement: scored.components.engagementQuality,
    brand: scored.components.brandFit,
    recent: scored.components.recentActivity,
    hiddenGem: scored.hiddenGem,
    marketLanguage: true,
  });
  const creator: ScoredCreator = {
    id: `${input.platform}:${input.handle}`,
    displayName: input.name,
    country: input.country ?? null,
    languages: [input.language ?? "en"],
    niches: [],
    audienceAge: "adult",
    contactRoute:
      input.platform === "instagram"
        ? "Public contact on business/creator profile or DM"
        : "Email in bio if listed, or platform DM",
    accounts: [
      {
        platform: input.platform,
        platformId: input.handle,
        handle: input.handle,
        url: input.url,
        followers: input.followers || null,
        source: input.source,
      },
    ],
    recentContent: input.captions.slice(0, 5).map((t, i) => ({
      postId: `${input.handle}-${i}`,
      url: input.url,
      titleOrCaption: t,
      publishedAt: null,
      views: input.views || null,
      likes: input.likes || null,
      comments: input.comments || null,
      language: input.language ?? null,
      madeForKids: false,
    })),
    followers: input.followers,
    tier: scored.tier,
    avgViews: input.views,
    engagementRate: scored.engagementRate,
    fit: scored.fit,
    components: scored.components,
    flags: scored.flags,
    reasons,
    llmFit: null,
    llmReasons: [],
    scoringMode: "rules only",
    suggestedDeal: scored.suggestedDeal,
    messageDraft: draftMessage({
      name: input.name,
      language: input.language ?? "en",
      title: input.captions[0] ?? "your recent post",
      deal: scored.suggestedDeal,
      brand,
    }),
    hiddenGem: scored.hiddenGem,
    dataDate: new Date().toISOString().slice(0, 10),
    dataSource:
      input.source === "web"
        ? "Search-engine index (site: query) — not platform scraping"
        : input.source === "api"
          ? "Instagram Graph API Business Discovery"
          : "Scout Lens (visible profile in your browser)",
    searchedMarket: input.market,
  };
  return creator;
}
