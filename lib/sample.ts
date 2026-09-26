import { mergeBrand } from "./brand";
import { getMarket } from "./markets";
import { draftMessage, hoursSaved, ruleReasons } from "./messages";
import { dictionaryTerms, isNicheId, looksLikePcHardware, shouldExcludePcHardware, buildTermsPerMarket, type NicheId } from "./niches";
import { scoreCreator } from "./scoring";
import type { BrandProfile, CreatorAccount, DiscoverResponse, ScoredCreator } from "./types";

type SampleSeed = {
  id: string;
  name: string;
  market: string;
  country: string;
  language: string;
  followers: number;
  yt: string;
  tiktok?: string;
  ig?: string;
  titles: string[];
  bio: string;
  views: number[];
  likes: number[];
  comments: number[];
  daysAgo: number[];
  kids?: boolean;
  competitor?: boolean;
  gambling?: boolean;
  niches?: NicheId[];
};

const SEEDS: SampleSeed[] = [
  {
    id: "s-fi-1",
    name: "PeliNurkka",
    market: "FI",
    country: "FI",
    language: "fi",
    followers: 18400,
    yt: "@PeliNurkka",
    tiktok: "@pelinurkka",
    ig: "pelinurkka",
    titles: ["Edullinen pelikone 2026 — käytetty 4070", "Näytönohjain kierrätys vs uusi", "Opiskelijan setup 600€"],
    bio: "Suomalainen PC-rakentaja. Edulliset pelikoneet, käytetyt osat. TikTok @pelinurkka instagram.com/pelinurkka",
    views: [9200, 7100, 5400],
    likes: [640, 480, 390],
    comments: [91, 62, 44],
    daysAgo: [6, 18, 29],
  },
  {
    id: "s-fi-2",
    name: "KorjaaKone",
    market: "FI",
    country: "FI",
    language: "fi",
    followers: 6200,
    yt: "@KorjaaKone",
    titles: ["Kunnostettu pelikone teardown", "Miksei heittää vanhaa konetta"],
    bio: "Korjaa älä heitä. Kunnostetut läppärit ja pelikoneet.",
    views: [2100, 1800],
    likes: [240, 190],
    comments: [38, 29],
    daysAgo: [4, 21],
  },
  {
    id: "s-se-1",
    name: "Bygg burken",
    market: "SE",
    country: "SE",
    language: "sv",
    followers: 27100,
    yt: "@ByggBurken",
    ig: "byggburken",
    titles: ["Bygga budgetdator 2026", "Begagnat grafikkort — värt det?"],
    bio: "Svensk PC-byggare. Budgetdatorer. instagram.com/byggburken",
    views: [11200, 8800],
    likes: [710, 540],
    comments: [77, 51],
    daysAgo: [9, 27],
  },
  {
    id: "s-de-1",
    name: "SchrauberPC",
    market: "DE",
    country: "DE",
    language: "de",
    followers: 41200,
    yt: "@SchrauberPC",
    tiktok: "@schrauberpc",
    titles: ["Gaming-PC unter 700€ mit gebrauchter Grafikkarte", "Refurbished vs neu — lohnt sich das?"],
    bio: "PC-Builds aus gebrauchten Teilen. tiktok.com/@schrauberpc",
    views: [18400, 12100],
    likes: [980, 640],
    comments: [120, 71],
    daysAgo: [3, 16],
  },
  {
    id: "s-de-2",
    name: "KidsPixelFun",
    market: "DE",
    country: "DE",
    language: "de",
    followers: 88000,
    yt: "@KidsPixelFun",
    titles: ["Minecraft für Kinder", "Bunte Gaming-PCs"],
    bio: "Familienkanal, made for kids.",
    views: [42000, 31000],
    likes: [900, 700],
    comments: [40, 22],
    daysAgo: [2, 8],
    kids: true,
  },
  {
    id: "s-pl-1",
    name: "SkładakPL",
    market: "PL",
    country: "PL",
    language: "pl",
    followers: 33500,
    yt: "@SkladakPL",
    titles: ["Tani komputer do gier z używaną kartą", "Składanie PC 2026 budżet"],
    bio: "Składanie PC, używane GPU, student setup.",
    views: [14200, 9900],
    likes: [820, 510],
    comments: [95, 60],
    daysAgo: [11, 24],
  },
  {
    id: "s-ee-1",
    name: "SetupTalu",
    market: "EE",
    country: "EE",
    language: "et",
    followers: 4100,
    yt: "@SetupTalu",
    titles: ["Odav mänguarvuti Eestis", "Kasutatud graafikakaart — kas tasub?"],
    bio: "Eesti DIY setup ja odavad mänguarvutid.",
    views: [1600, 1200],
    likes: [180, 140],
    comments: [31, 22],
    daysAgo: [7, 19],
  },
  {
    id: "s-br-1",
    name: "PC Barato BR",
    market: "BR",
    country: "BR",
    language: "pt",
    followers: 46800,
    yt: "@PCBaratoBR",
    ig: "pcbaratobr",
    titles: ["PC gamer barato com GPU usada", "Montar PC recondicionado 2026"],
    bio: "PCs gamer usados e recondicionados. instagram.com/pcbaratobr",
    views: [22100, 15400],
    likes: [1400, 890],
    comments: [210, 130],
    daysAgo: [5, 14],
  },
  {
    id: "s-vn-1",
    name: "Lắp PC Rẻ",
    market: "VN",
    country: "VN",
    language: "vi",
    followers: 28600,
    yt: "@LapPCRe",
    tiktok: "@lappcre",
    titles: ["Build PC gaming giá rẻ 2026", "Card đồ họa cũ có đáng mua?"],
    bio: "Lắp PC, card cũ, setup sinh viên. tiktok.com/@lappcre",
    views: [9800, 7200],
    likes: [620, 410],
    comments: [88, 54],
    daysAgo: [6, 17],
  },
  {
    id: "s-vn-g1",
    name: "Kaito Gameplay",
    market: "VN",
    country: "VN",
    language: "vi",
    followers: 31200,
    yt: "@KaitoGameplay",
    titles: ["Gameplay ranked hôm nay", "Chơi game 40 phút highlight"],
    bio: "Kênh chơi game, let's play. Không lắp PC.",
    views: [15400, 9100],
    likes: [880, 520],
    comments: [140, 77],
    daysAgo: [2, 9],
    niches: ["gaming"],
  },
  {
    id: "s-vn-macro",
    name: "LiveSânKhấu VN",
    market: "VN",
    country: "VN",
    language: "vi",
    followers: 8_200_000,
    yt: "@LiveSanKhauVN",
    titles: ["Gameplay ranked full stream", "Highlight chơi game tối qua"],
    bio: "SAMPLE — fictional mega streamer for size-filter demos. Not MixiGaming.",
    views: [2_100_000, 1_400_000],
    likes: [82000, 51000],
    comments: [4100, 2800],
    daysAgo: [1, 4],
    niches: ["gaming"],
  },
  {
    id: "s-fi-g1",
    name: "PeliKlubi",
    market: "FI",
    country: "FI",
    language: "fi",
    followers: 19800,
    yt: "@PeliKlubi",
    titles: ["Pelivideo — let's play", "Uuden pelin gameplay"],
    bio: "Suomalainen pelikanava. Let's play, ei PC-rakentamista.",
    views: [8200, 6100],
    likes: [510, 380],
    comments: [72, 49],
    daysAgo: [3, 11],
    niches: ["gaming"],
  },
  {
    id: "s-se-g1",
    name: "Spelstugan",
    market: "SE",
    country: "SE",
    language: "sv",
    followers: 22400,
    yt: "@Spelstugan",
    titles: ["Let's play highlight", "Gameplay — ny release"],
    bio: "Svensk let's play-kanal.",
    views: [9900, 7400],
    likes: [600, 410],
    comments: [81, 55],
    daysAgo: [4, 13],
    niches: ["gaming"],
  },
  {
    id: "s-de-g1",
    name: "Let's Play Mira",
    market: "DE",
    country: "DE",
    language: "de",
    followers: 44100,
    yt: "@LetsPlayMira",
    titles: ["Gameplay Highlight", "Let's Play Folge 12"],
    bio: "Let's Play und Gameplay. Kein PC-Building.",
    views: [19000, 11200],
    likes: [1100, 640],
    comments: [150, 88],
    daysAgo: [1, 8],
    niches: ["gaming"],
  },
  {
    id: "s-pl-g1",
    name: "GraMyPL",
    market: "PL",
    country: "PL",
    language: "pl",
    followers: 26700,
    yt: "@GraMyPL",
    titles: ["Gameplay — nowa gra", "Zagrajmy odcinek 4"],
    bio: "Polski kanał let's play.",
    views: [10100, 7700],
    likes: [640, 430],
    comments: [90, 58],
    daysAgo: [5, 12],
    niches: ["gaming"],
  },
  {
    id: "s-ee-g1",
    name: "Mängin",
    market: "EE",
    country: "EE",
    language: "et",
    followers: 5400,
    yt: "@ManginEE",
    titles: ["Gameplay session", "Let's play eesti keeles"],
    bio: "Eesti mängu let's play.",
    views: [1900, 1400],
    likes: [210, 150],
    comments: [34, 22],
    daysAgo: [6, 16],
    niches: ["gaming"],
  },
  {
    id: "s-br-g1",
    name: "Gameplay do Gui",
    market: "BR",
    country: "BR",
    language: "pt",
    followers: 38900,
    yt: "@GameplayDoGui",
    titles: ["Gameplay ranked", "Let's play — novo jogo"],
    bio: "Canal de gameplay. Sem montagem de PC.",
    views: [17600, 12100],
    likes: [980, 670],
    comments: [160, 99],
    daysAgo: [2, 10],
    niches: ["gaming"],
  },
  {
    id: "s-de-3",
    name: "BetDrop Clips",
    market: "DE",
    country: "DE",
    language: "de",
    followers: 19200,
    yt: "@BetDropClips",
    titles: ["Casino stream highlights", "Wetten + Gaming-PC giveaway"],
    bio: "Gambling clips and crypto giveaways.",
    views: [8000, 6200],
    likes: [300, 210],
    comments: [18, 11],
    daysAgo: [1, 12],
    gambling: true,
  },
  {
    id: "s-fi-3",
    name: "SwapShop Tech",
    market: "FI",
    country: "FI",
    language: "fi",
    followers: 22100,
    yt: "@SwapShopTech",
    titles: ["Back Market vs kunnostettu pelikone", "Käytetty elektroniikka vertailu"],
    bio: "Vertailen Back Market ja muita second-hand kauppoja.",
    views: [7400, 5100],
    likes: [320, 210],
    comments: [48, 33],
    daysAgo: [8, 22],
    competitor: true,
  },
];

export function sampleDiscover(brief: string, markets: string[], nicheIds?: string[], brandPartial?: Partial<BrandProfile>): DiscoverResponse {
  const brand = mergeBrand(brandPartial);
  const date = "2026-09-20";
  const wanted = (nicheIds ?? []).filter(isNicheId);
  const selected = SEEDS.filter((s) => {
    if (markets.length && !markets.includes(s.market)) return false;
    const tags = s.niches ?? (["pc-building", "budget-second-hand"] as NicheId[]);
    if (wanted.length === 0) return true;
    if (!tags.some((n) => wanted.includes(n))) return false;
    const blob = `${s.bio} ${s.titles.join(" ")}`;
    if (shouldExcludePcHardware(wanted) && looksLikePcHardware(blob)) return false;
    return true;
  });
  const creators: ScoredCreator[] = selected.map((s) => {
    const views = avg(s.views);
    const likes = avg(s.likes);
    const comments = avg(s.comments);
    const extra = [
      s.competitor ? "Back Market comparison" : "",
      s.gambling ? "casino wetten crypto giveaway" : "",
    ].join(" ");
    const text = `${s.bio} ${s.titles.join(" ")} ${extra}`;
    const terms = dictionaryTerms(
      wanted.length ? wanted : ["pc-building", "budget-second-hand"],
      s.language,
    );
    const scored = scoreCreator({
      briefTerms: terms,
      text,
      channelCountry: s.country,
      targetMarket: s.market,
      contentInMarketLanguage: true,
      likes,
      comments,
      views,
      followers: s.followers,
      lastUpload: daysAgo(s.daysAgo[0]),
      madeForKids: Boolean(s.kids),
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
    const title = s.titles[0];
    const accounts: CreatorAccount[] = [
      {
        platform: "youtube",
        platformId: s.id,
        handle: s.yt,
        url: `https://www.youtube.com/${s.yt}`,
        followers: s.followers,
        source: "sample",
      },
    ];
    if (s.tiktok) {
      accounts.push({
        platform: "tiktok",
        platformId: s.tiktok,
        handle: s.tiktok,
        url: `https://www.tiktok.com/${s.tiktok}`,
        followers: null,
        source: "linked",
      });
    }
    if (s.ig) {
      accounts.push({
        platform: "instagram",
        platformId: s.ig,
        handle: s.ig,
        url: `https://www.instagram.com/${s.ig}`,
        followers: null,
        source: "linked",
      });
    }
    return {
      id: s.id,
      displayName: s.name,
      country: s.country,
      languages: [s.language],
      niches: ["PC building", "Budget & second-hand"],
      audienceAge: s.kids ? "kids" : "adult",
      contactRoute: "YouTube About page (business email) / platform DM",
      accounts,
      recentContent: s.titles.map((t, i) => ({
        postId: `${s.id}-v${i}`,
        url: `https://www.youtube.com/${s.yt}`,
        titleOrCaption: t,
        publishedAt: daysAgo(s.daysAgo[i] ?? 30).toISOString(),
        views: s.views[i] ?? null,
        likes: s.likes[i] ?? null,
        comments: s.comments[i] ?? null,
        language: s.language,
        madeForKids: Boolean(s.kids),
      })),
      followers: s.followers,
      tier: scored.tier,
      avgViews: views,
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
        name: s.name,
        language: s.language,
        title,
        deal: scored.suggestedDeal,
        brand,
      }),
      hiddenGem: scored.hiddenGem,
      dataDate: date,
      dataSource: "sample (fictional profiles for demo — not live YouTube)",
      searchedMarket: s.market,
    };
  });

  creators.sort((a, b) => b.fit - a.fit);
  const termsPerMarket = buildTermsPerMarket(wanted.length ? wanted : ["pc-building", "budget-second-hand"]);

  return {
    runId: `sample-${Date.now()}`,
    brief,
    createdAt: new Date().toISOString(),
    mode: "sample",
    termsPerMarket,
    creators,
    apiUnitsUsed: 0,
    hoursSavedEstimate: hoursSaved(creators.length),
    notes: [
      "SAMPLE DATA — fictional profiles labelled as sample. Do not treat as real creators.",
      "YouTube is fully live when YOUTUBE_API_KEY is set. TikTok/Instagram discovery uses search-engine site: queries, Instagram Graph Business Discovery, Scout Lens, and YouTube-linked handles — never fake logins or platform scraping.",
    ],
  };
}

function avg(n: number[]) {
  return Math.round(n.reduce((a, b) => a + b, 0) / n.length);
}

function daysAgo(d: number) {
  return new Date(Date.now() - d * 86_400_000);
}
