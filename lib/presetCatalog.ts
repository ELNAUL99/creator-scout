import { mergeBrand } from "./brand";
import { MARKETS } from "./markets";
import { draftMessage, ruleReasons } from "./messages";
import { dictionaryTerms, isNicheId, NICHE_IDS, NICHE_TERMS, type NicheId } from "./niches";
import { scoreCreator } from "./scoring";
import type { BrandProfile, DiscoverRequest, Platform, ScoredCreator } from "./types";

export const PRESET_PLATFORMS: Platform[] = ["tiktok", "instagram", "facebook", "twitch"];
/** Creators per niche per platform per country — enough to show 4–5 on one topic filter. */
export const PRESET_PER_TOPIC_PLATFORM = 5;
/** 15 niches × 4 platforms × 5 = 300 fictional rows per country. */
export const PRESET_PER_COUNTRY = NICHE_IDS.length * PRESET_PLATFORMS.length * PRESET_PER_TOPIC_PLATFORM;

const GIVEN = [
  "Aino", "Maya", "Luca", "Priya", "Yuki", "Noor", "Sofia", "Kenji", "Amara", "Hugo",
  "Zara", "Mateo", "Linh", "Omar", "Elsa", "Diego", "Ines", "Kai", "Nia", "Theo",
  "Hana", "Ravi", "Freya", "Jamal", "Chloe", "Soren", "Aya", "Niko", "Leila", "Owen",
];

const TITLES: Record<NicheId, [string, string, string]> = {
  gaming: ["Ranked climb, no commentary", "This loadout is broken", "Co-op fail compilation"],
  "pc-building": ["Used GPU vs new — 2026", "Student PC under €600", "Cable management that actually cools"],
  "budget-second-hand": ["Thrift haul that prints money", "Refurbished vs new, honest wear", "Trade-in before you upgrade"],
  "tech-reviews": ["I used this for 30 days", "Flagship vs last-gen", "Hidden setting worth turning on"],
  sustainability: ["One week zero-waste desk", "Repair, don’t replace", "What recycling actually takes"],
  beauty: ["Glass-skin routine under 10 min", "Lip oil vs gloss 8-hour test", "Clean-girl makeup restock"],
  fitness: ["20-minute hotel workout", "Protein on a budget", "Form check: don’t skip this"],
  food: ["One-pan dinners after work", "Street snack vs homemade", "Grocery haul under €20"],
  travel: ["48 hours in my city", "Carry-on only packing", "Local breakfast crawl"],
  fashion: ["Three outfits, one jacket", "Thrift flip before it trends", "Sneaker rotation on a budget"],
  parenting: ["Toddler morning that works", "Screen-time rules we kept", "Lunchbox that survives school"],
  "personal-finance": ["First €1k emergency fund", "Side hustle that isn’t a scam", "Subscriptions I actually cut"],
  "diy-home": ["Ikea hack that didn’t break", "Renter-friendly wall fix", "Tiny balcony garden"],
  pets: ["Rescue week one", "Rainy-day enrichment", "Vet visit without the panic"],
  "fps-esports": ["Aim routine 12 minutes", "Utility lineup for ranked", "Why I swapped my mouse"],
};

function mulberry(seed: number) {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sizeFor(i: number, rnd: () => number) {
  const bucket = i % 5;
  if (bucket === 0) return 800 + Math.floor(rnd() * 8_700);
  if (bucket === 1) return 10_200 + Math.floor(rnd() * 38_000);
  if (bucket === 2) return 51_000 + Math.floor(rnd() * 48_000);
  if (bucket === 3) return 110_000 + Math.floor(rnd() * 130_000);
  return 260_000 + Math.floor(rnd() * 1_900_000);
}

function profileUrl(platform: Platform, handle: string) {
  const h = handle.replace(/^@/, "");
  if (platform === "tiktok") return `https://www.tiktok.com/@${h}`;
  if (platform === "instagram") return `https://www.instagram.com/${h}/`;
  if (platform === "facebook") return `https://www.facebook.com/${h}`;
  if (platform === "twitch") return `https://www.twitch.tv/${h}`;
  return `https://www.youtube.com/@${h}`;
}

function contactRoute(platform: Platform) {
  if (platform === "facebook") return "Facebook Page inbox (professional) — demo handle, not a live Graph crawl";
  if (platform === "twitch") return "Twitch panel / whispers — demo handle, not Helix crawl";
  if (platform === "instagram") return "IG professional contact or DM — demo handle";
  if (platform === "tiktok") return "TikTok business inbox — demo handle";
  return "YouTube About";
}

export type PresetSeed = {
  platform: Platform;
  handle: string;
  name: string;
  country: string;
  language: string;
  niches: NicheId[];
  followers: number;
  titles: string[];
  views: number[];
  likes: number[];
  comments: number[];
  daysAgo: number[];
  makeupTrend: boolean;
};

/** 300 fictional creators per country: 5 per niche per TikTok/IG/Facebook/Twitch. */
export function buildPresetSeeds(): PresetSeed[] {
  const out: PresetSeed[] = [];
  for (let m = 0; m < MARKETS.length; m++) {
    const market = MARKETS[m];
    let i = 0;
    for (let n = 0; n < NICHE_IDS.length; n++) {
      const primary = NICHE_IDS[n];
      for (let p = 0; p < PRESET_PLATFORMS.length; p++) {
        const platform = PRESET_PLATFORMS[p];
        for (let k = 0; k < PRESET_PER_TOPIC_PLATFORM; k++) {
          const rnd = mulberry(m * 100_000 + n * 1_000 + p * 50 + k * 13 + 7);
          const niches: NicheId[] = [primary];
          if (k === 0) {
            const extra = NICHE_IDS[(n + 4) % NICHE_IDS.length];
            if (extra !== primary) niches.push(extra);
          }
          const makeupTrend = primary === "beauty" && k < 4;
          const viralClip = k === PRESET_PER_TOPIC_PLATFORM - 1;
          const followers = sizeFor(n * PRESET_PER_TOPIC_PLATFORM + k, rnd);
          const viewMul = makeupTrend || viralClip ? 6 + rnd() * 14 : 0.08 + rnd() * 0.7;
          const v0 = Math.max(400, Math.round(followers * viewMul * (0.7 + rnd() * 0.6)));
          const v1 = Math.max(200, Math.round(v0 * (0.45 + rnd() * 0.4)));
          const v2 = Math.max(120, Math.round(v0 * (0.25 + rnd() * 0.3)));
          const given = GIVEN[(i + m * 11) % GIVEN.length];
          const label = niches.map((id) => NICHE_TERMS[id].label.replace(/\s+/g, "")).join("/");
          const handle = `csdemo_${platform.slice(0, 2)}_${market.code.toLowerCase()}_${i}`;
          const local = makeupTrend ? "glass skin lip oil clean girl" : viralClip ? "clip took off" : "";
          const titles = TITLES[primary].map((t, ti) => {
            if (ti === 0 && makeupTrend) return `${t} — ${market.name}`;
            if (ti === 1 && niches[1]) return TITLES[niches[1]][0];
            return `${t}${ti === 2 ? ` (${market.code})` : ""}`;
          });
          out.push({
            platform,
            handle,
            name: `${given} ${label}`,
            country: market.code,
            language: market.language,
            niches,
            followers,
            titles: titles.map((t) => `${t} ${local}`.trim()),
            views: [v0, v1, v2],
            likes: [Math.round(v0 * 0.06), Math.round(v1 * 0.07), Math.round(v2 * 0.05)],
            comments: [Math.round(v0 * 0.008), Math.round(v1 * 0.009), Math.round(v2 * 0.006)],
            daysAgo: [1 + Math.floor(rnd() * 12), 14 + Math.floor(rnd() * 20), 40 + Math.floor(rnd() * 40)],
            makeupTrend,
          });
          i += 1;
        }
      }
    }
  }
  return out;
}

let cached: PresetSeed[] | null = null;
export function presetSeeds() {
  if (!cached) cached = buildPresetSeeds();
  return cached;
}

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function presetCatalogCreators(req: DiscoverRequest): ScoredCreator[] {
  const want = new Set(req.platforms?.length ? req.platforms : PRESET_PLATFORMS);
  const niches = [...(req.nicheIds ?? []), req.nicheId ?? ""].filter(isNicheId) as NicheId[];
  const markets = (req.markets ?? []).map((m) => m.toUpperCase());
  const brand = mergeBrand(req.brand);
  const date = new Date().toISOString().slice(0, 10);

  return presetSeeds()
    .filter((s) => want.has(s.platform))
    .filter((s) => !markets.length || markets.includes(s.country))
    .filter((s) => !niches.length || s.niches.some((n) => niches.includes(n)))
    .map((s) => {
      const text = `${s.titles.join(" ")} ${s.niches.join(" ")} ${s.makeupTrend ? "makeup glass-skin lip-oil" : ""}`;
      const terms = dictionaryTerms(niches.length ? niches : s.niches, s.language);
      const views = Math.round(s.views.reduce((a, b) => a + b, 0) / s.views.length);
      const likes = Math.round(s.likes.reduce((a, b) => a + b, 0) / s.likes.length);
      const comments = Math.round(s.comments.reduce((a, b) => a + b, 0) / s.comments.length);
      const scored = scoreCreator({
        briefTerms: [...new Set([...terms, ...brand.goodFitWords.slice(0, 8)])],
        text,
        channelCountry: s.country,
        targetMarket: markets[0] ?? s.country,
        contentInMarketLanguage: true,
        likes,
        comments,
        views,
        followers: s.followers,
        lastUpload: new Date(isoDaysAgo(s.daysAgo[0])),
        madeForKids: false,
        brand,
      });
      const handle = s.handle;
      const url = profileUrl(s.platform, handle);
      const reasons = [
        "Preset demo catalog — fictional creator for judging empty TikTok/Instagram/Facebook/Twitch search. Not a live platform crawl.",
        ...ruleReasons({
          niche: scored.components.nicheRelevance,
          audience: scored.components.audienceMatch,
          engagement: scored.components.engagementQuality,
          brand: scored.components.brandFit,
          recent: scored.components.recentActivity,
          hiddenGem: scored.hiddenGem,
          marketLanguage: true,
          brandName: brand.name,
          prenew: brand.name.trim().toLowerCase() === "prenew",
        }),
      ];
      if (s.makeupTrend) {
        reasons.unshift("Riding a made-up 2026 makeup trend (glass skin / lip oil) with views far above follower count.");
      }
      return {
        id: `${s.platform}:${handle}`,
        displayName: s.name,
        country: s.country,
        languages: [s.language],
        niches: s.niches,
        audienceAge: "adult" as const,
        contactRoute: contactRoute(s.platform),
        accounts: [
          {
            platform: s.platform,
            platformId: handle,
            handle: s.platform === "tiktok" || s.platform === "twitch" ? `@${handle}` : handle,
            url,
            followers: s.followers,
            source: "sample" as const,
          },
        ],
        recentContent: s.titles.map((title, i) => ({
          postId: `${handle}-${i}`,
          url,
          titleOrCaption: title,
          publishedAt: isoDaysAgo(s.daysAgo[i] ?? 20),
          views: s.views[i] ?? null,
          likes: s.likes[i] ?? null,
          comments: s.comments[i] ?? null,
          language: s.language,
          madeForKids: false,
        })),
        followers: s.followers,
        tier: scored.tier,
        avgViews: views,
        engagementRate: scored.engagementRate,
        fit: scored.fit,
        components: scored.components,
        flags: scored.flags,
        reasons: reasons.slice(0, 5),
        llmFit: null,
        llmReasons: [],
        scoringMode: "rules only" as const,
        suggestedDeal: scored.suggestedDeal,
        messageDraft: draftMessage({
          name: s.name,
          language: s.language,
          title: s.titles[0],
          deal: scored.suggestedDeal,
          brand,
        }),
        hiddenGem: scored.hiddenGem,
        dataDate: date,
        dataSource: "Preset demo catalog (fictional — not live TikTok/IG/Facebook/Twitch APIs)",
        searchedMarket: s.country,
      };
    });
}
