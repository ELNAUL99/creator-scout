export type SizeTier = "nano" | "micro" | "mid" | "macro";
export type Platform = "youtube" | "tiktok" | "instagram";
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
  /** When true, drop YouTube channels that don’t look like the selected country. */
  localOnly?: boolean;
};

export type MarketTerms = {
  country: string;
  language: string;
  terms: string[];
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
