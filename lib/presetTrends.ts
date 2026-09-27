import { isNicheId, NICHE_TERMS, type NicheId } from "./niches";
import { presetSeeds, type PresetSeed } from "./presetCatalog";
import type { RisingHit, RisingTrend } from "./trends";

type TrendPack = { hashtags: string[]; sounds: string[] };

const CREATORS_PER_TOPIC = 5;
const BREAKOUTS_PER_TOPIC = 2;

const NICHE_PACKS: Record<NicheId, TrendPack> = {
  gaming: {
    hashtags: ["gameplay", "ranked", "clutch", "streamer", "minecraft"],
    sounds: ["epic win", "original sound", "game ost"],
  },
  "fps-esports": {
    hashtags: ["valorant", "ace", "clutch", "ranked", "cs2"],
    sounds: ["headshot mix", "original sound", "comeback"],
  },
  "pc-building": {
    hashtags: ["pcbuild", "rgb", "cablemanagement", "battlestation", "custompc"],
    sounds: ["pc boot", "original sound", "coil whine"],
  },
  "tech-reviews": {
    hashtags: ["techreview", "unboxing", "vs", "flagship", "gadget"],
    sounds: ["unbox asmr", "original sound", "wow"],
  },
  "budget-second-hand": {
    hashtags: ["thrifthaul", "usedgpu", "budgetpc", "secondhand", "deal"],
    sounds: ["haul", "original sound", "cha-ching"],
  },
  sustainability: {
    hashtags: ["zerowaste", "repairdontreplace", "sustainable", "recycle", "ecohack"],
    sounds: ["original sound", "nature", "fix it"],
  },
  beauty: {
    hashtags: ["glassskin", "lipoil", "cleangirl", "dewymakeup", "softglam"],
    sounds: ["oh no sped up", "original sound", "aesthetic beat"],
  },
  fitness: {
    hashtags: ["gymtok", "homeroutine", "protein", "formcheck", "hotelfit"],
    sounds: ["workout mix", "original sound", "countdown"],
  },
  food: {
    hashtags: ["foodtok", "recipe", "groceryhaul", "streetfood", "mealprep"],
    sounds: ["sizzle", "original sound", "asmr eat"],
  },
  travel: {
    hashtags: ["travel", "hiddengem", "carryon", "citywalk", "localfood"],
    sounds: ["airport", "original sound", "city night"],
  },
  fashion: {
    hashtags: ["ootd", "thriftflip", "grwm", "sneakers", "lookbook"],
    sounds: ["runway", "original sound", "oh no sped up"],
  },
  parenting: {
    hashtags: ["momtok", "toddler", "lunchbox", "screentime", "morningroutine"],
    sounds: ["original sound", "lullaby", "chaos"],
  },
  "personal-finance": {
    hashtags: ["money", "budget", "sidehustle", "emergencyfund", "subscriptions"],
    sounds: ["original sound", "cash register", "soft piano"],
  },
  "diy-home": {
    hashtags: ["diy", "ikeahack", "renterfriendly", "balcony", "homeproject"],
    sounds: ["drill", "original sound", "before after"],
  },
  pets: {
    hashtags: ["dogtok", "cattok", "rescue", "petcare", "enrichment"],
    sounds: ["original sound", "woof mix", "treat time"],
  },
};

function hashCode(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function toHit(s: PresetSeed, tag: string, kind: "trend" | "sound", forceBreakout: boolean): RisingHit {
  let followers = s.followers;
  let views = s.views[0];
  if (forceBreakout) {
    followers = 1_800 + (Math.abs(hashCode(s.handle + tag)) % 14_000);
    views = Math.max(views, Math.round(followers * (9 + (hashCode(tag) % 18))));
  }
  const videoTitle =
    kind === "sound" ? `${s.titles[0]} — used ♪ ${tag}` : `${s.titles[0]} — riding #${tag}`;
  return {
    videoId: `${s.handle}-${kind}-${tag}`,
    videoTitle,
    videoUrl: `https://www.tiktok.com/@${s.handle.replace(/^@/, "")}`,
    publishedAt: new Date(Date.now() - s.daysAgo[0] * 86_400_000).toISOString(),
    views,
    likes: Math.max(s.likes[0], Math.round(views * 0.06)),
    channelId: s.handle,
    channelTitle: s.name,
    channelUrl: `https://www.tiktok.com/@${s.handle.replace(/^@/, "")}`,
    followers,
    country: s.country,
    market: s.country,
    viewsPerSub: followers > 0 ? views / followers : views,
    breakout: views >= followers * 4,
    tags: [tag],
  };
}

function selectedNiches(nicheIds: string[]): NicheId[] {
  const ids = nicheIds.filter(isNicheId);
  return ids.length ? ids : ["gaming"];
}

export function presetRisingTrends(nicheIds: string[] = []): {
  suggestions: string[];
  breakouts: RisingHit[];
  chart: RisingHit[];
  trends: RisingTrend[];
  notes: string[];
} {
  const niches = selectedNiches(nicheIds);
  const hashtags = [...new Set(niches.flatMap((id) => NICHE_PACKS[id].hashtags))].slice(0, 8);
  const sounds = [...new Set(niches.flatMap((id) => NICHE_PACKS[id].sounds))].slice(0, 4);
  const pool = presetSeeds().filter((s) => s.platform === "tiktok" && s.niches.some((n) => niches.includes(n)));
  const fallback = pool.length ? pool : presetSeeds().filter((s) => s.platform === "tiktok");
  let cursor = 0;
  function take(n: number) {
    const slice: PresetSeed[] = [];
    for (let i = 0; i < n; i++) {
      slice.push(fallback[(cursor + i) % fallback.length]);
    }
    cursor += n;
    return slice;
  }

  const hashTrends: RisingTrend[] = hashtags.map((label) => {
    const hits = take(CREATORS_PER_TOPIC).map((s, i) => toHit(s, label, "trend", i < BREAKOUTS_PER_TOPIC));
    return {
      label,
      kind: "hashtag" as const,
      views: hits.reduce((sum, h) => sum + h.views, 0),
      hits,
    };
  });

  const soundTrends: RisingTrend[] = sounds.map((label) => {
    const hits = take(CREATORS_PER_TOPIC).map((s, i) => toHit(s, label, "sound", i < BREAKOUTS_PER_TOPIC));
    return {
      label,
      kind: "sound" as const,
      views: hits.reduce((sum, h) => sum + h.views, 0),
      hits,
    };
  });

  const chart = [...hashTrends, ...soundTrends].flatMap((t) => t.hits);
  const labels = niches.map((id) => NICHE_TERMS[id].label).join(", ");
  return {
    suggestions: [...hashtags, ...sounds],
    breakouts: chart.filter((h) => h.breakout).sort((a, b) => b.viewsPerSub - a.viewsPerSub),
    chart,
    trends: [...hashTrends, ...soundTrends],
    notes: [
      `Hot search pack for ${labels} — staged hashtags/sounds and demo accounts in that niche, not TikTok Creative Center.`,
      "Breakout rows are labelled csdemo_* accounts: few followers, one video that spiked because of that trend.",
    ],
  };
}
