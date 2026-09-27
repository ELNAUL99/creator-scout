export type SizeTier = "nano" | "micro" | "mid" | "macro";
export type Platform = "youtube" | "tiktok" | "instagram" | "facebook" | "twitch";
export type AccountSource = "api" | "linked" | "extension" | "opt_in" | "provider" | "sample" | "web";
export type AudienceAge = "kids" | "teen" | "adult" | "mixed";

export type ScoreComponents = {
  nicheRelevance: number;
  audienceMatch: number;
  engagementQuality: number;
  brandFit: number;
  recentActivity: number;
};

export type CreatorAccount = {
  platform: Platform;
  platformId: string;
  handle: string;
  url: string;
  followers: number | null;
  source: AccountSource;
};

export type RecentPost = {
  postId: string;
  url: string;
  titleOrCaption: string;
  publishedAt: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  language: string | null;
  madeForKids: boolean;
  durationSeconds?: number | null;
};

export type YoutubeResearch = {
  pulledAt: string;
  channelId: string;
  description: string;
  customUrl: string | null;
  defaultLanguage: string | null;
  keywords: string[];
  topics: string[];
  lifetimeViews: number;
  videoCount: number;
  hiddenSubscribers: boolean;
  channelMadeForKids: boolean | null;
  startedAt: string | null;
  subscriberCount: number;
  latestUploads: RecentPost[];
  searchMatched: RecentPost[];
};

export type ScoredCreator = {
  id: string;
  displayName: string;
  country: string | null;
  languages: string[];
  niches: string[];
  audienceAge: AudienceAge;
  contactRoute: string;
  accounts: CreatorAccount[];
  recentContent: RecentPost[];
  followers: number;
  tier: SizeTier;
  avgViews: number;
  /** Lifetime total uploads (YouTube statistics.videoCount); null when unknown. */
  totalVideos?: number | null;
  /** Channel creation date (YouTube snippet.publishedAt); null when unknown. */
  startedAt?: string | null;
  engagementRate: number;
  fit: number;
  components: ScoreComponents;
  flags: string[];
  reasons: string[];
  llmFit: number | null;
  llmReasons: string[];
  scoringMode: "rules+llm" | "rules only";
  suggestedDeal: string;
  messageDraft: string;
  hiddenGem: boolean;
  dataDate: string;
  dataSource: string;
  searchedMarket: string;
  youtube?: YoutubeResearch;
};

export type BrandProfile = {
  name: string;
  pitch: string;
  goodFitWords: string[];
  competitors: string[];
  riskWords: string[];
  disclosureTags: Record<string, string>;
};

export type DiscoverRequest = {
  brief: string;
  markets: string[];
  nicheIds?: string[];
  nicheId?: string;
  sizeMin: number;
  sizeMax: number;
  includeNano: boolean;
  includeMacro?: boolean;
  timeWindowDays: number;
  platforms: Platform[];
  brand?: Partial<BrandProfile>;
  mode?: "auto" | "sample" | "live";
  youtubeApiKey?: string;
  webDiscover?: boolean;
  /** Logged-in workspace — used to load connected TikTok/Instagram opt-ins. */
  workspaceId?: string | null;
  /** Off by default. Sheet is collab history, not live discovery. */
  includePrenewCollabs?: boolean;
  /** Demo catalog of fictional TT/IG/FB/Twitch creators. Default off. */
  includePresetCatalog?: boolean;
  /** When true, drop YouTube channels that don’t look like the selected country. */
  localOnly?: boolean;
};

export type MarketTerms = {
  country: string;
  countryName?: string;
  language: string;
  languageName?: string;
  region?: string;
  terms: string[];
  originalTerms?: string[];
  niche: string;
  source: "dictionary" | "llm";
};

export type DiscoverResponse = {
  runId: string;
  brief: string;
  createdAt: string;
  mode: "sample" | "live";
  termsPerMarket: MarketTerms[];
  creators: ScoredCreator[];
  apiUnitsUsed: number;
  hoursSavedEstimate: number;
  notes: string[];
  error?: string;
};
