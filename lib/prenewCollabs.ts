import { mergeBrand } from "./brand";
import { getMarket } from "./markets";
import { draftMessage, ruleReasons } from "./messages";
import { dictionaryTerms, isNicheId, type NicheId } from "./niches";
import { scoreCreator } from "./scoring";
import type { CreatorAccount, DiscoverRequest, ScoredCreator } from "./types";

/** First-party Prenew collaboration history (spreadsheet they provided). Not scraped. */
type Collab = {
  name: string;
  market: string;
  nicheLabel: string;
  niches: NicheId[];
  ytSubs: number;
  ytViews: number;
  ttFol: number;
  ttViews: number;
  platforms: ("youtube" | "tiktok")[];
};

const COLLABS: Collab[] = [
  { name: "Ghostukun", market: "DE", nicheLabel: "Dark Souls", niches: ["gaming"], ytSubs: 6000, ytViews: 10000, ttFol: 18900, ttViews: 30000, platforms: ["youtube", "tiktok"] },
  { name: "Tubu", market: "FI", nicheLabel: "Misc. gaming", niches: ["gaming"], ytSubs: 106000, ytViews: 0, ttFol: 6000, ttViews: 0, platforms: ["youtube", "tiktok"] },
  { name: "LeiskaGG", market: "FI", nicheLabel: "Clash Royale, Fortnite", niches: ["gaming", "fps-esports"], ytSubs: 1210, ytViews: 2000, ttFol: 17700, ttViews: 20000, platforms: ["youtube", "tiktok"] },
  { name: "MrRockis", market: "FI", nicheLabel: "Minecraft", niches: ["gaming"], ytSubs: 94000, ytViews: 50000, ttFol: 5000, ttViews: 5000, platforms: ["youtube", "tiktok"] },
  { name: "Applezzi", market: "FI", nicheLabel: "Minecraft", niches: ["gaming"], ytSubs: 104000, ytViews: 47500, ttFol: 15800, ttViews: 52500, platforms: ["youtube", "tiktok"] },
  { name: "Chief Mara", market: "FI", nicheLabel: "Fortnite", niches: ["gaming", "fps-esports"], ytSubs: 13700, ytViews: 1750, ttFol: 5218, ttViews: 25500, platforms: ["youtube", "tiktok"] },
  { name: "kreativofc", market: "SE", nicheLabel: "CS2 gameplay", niches: ["gaming", "fps-esports"], ytSubs: 0, ytViews: 0, ttFol: 3208, ttViews: 25500, platforms: ["tiktok"] },
  { name: "Steven Erixon", market: "SE", nicheLabel: "Gaming news / tech", niches: ["gaming", "tech-reviews"], ytSubs: 19000, ytViews: 1000, ttFol: 73000, ttViews: 12500, platforms: ["youtube", "tiktok"] },
  { name: "Memetix_swe", market: "SE", nicheLabel: "Gaming / comedy", niches: ["gaming"], ytSubs: 37600, ytViews: 0, ttFol: 349000, ttViews: 65000, platforms: ["youtube", "tiktok"] },
  { name: "LUIGI CREMONA", market: "DE", nicheLabel: "Gaming gear", niches: ["tech-reviews", "pc-building"], ytSubs: 0, ytViews: 0, ttFol: 300000, ttViews: 130000, platforms: ["tiktok"] },
  { name: "GaTo", market: "DE", nicheLabel: "ARK", niches: ["gaming"], ytSubs: 65300, ytViews: 15000, ttFol: 2500, ttViews: 8000, platforms: ["youtube", "tiktok"] },
  { name: "Joosep Teeb Asju", market: "EE", nicheLabel: "Minecraft", niches: ["gaming"], ytSubs: 6600, ytViews: 1250, ttFol: 3000, ttViews: 5500, platforms: ["youtube", "tiktok"] },
  { name: "Ohmyremi", market: "EE", nicheLabel: "GTA", niches: ["gaming"], ytSubs: 12700, ytViews: 1750, ttFol: 2000, ttViews: 5500, platforms: ["youtube", "tiktok"] },
  { name: "EstMagicz", market: "EE", nicheLabel: "General games", niches: ["gaming"], ytSubs: 49000, ytViews: 20000, ttFol: 4800, ttViews: 12500, platforms: ["youtube", "tiktok"] },
  { name: "Mishurba", market: "SE", nicheLabel: "Tech", niches: ["tech-reviews"], ytSubs: 3000, ytViews: 1000, ttFol: 60000, ttViews: 50500, platforms: ["youtube", "tiktok"] },
  { name: "Uzkapajam", market: "LV", nicheLabel: "Gaming gear", niches: ["tech-reviews", "pc-building"], ytSubs: 21000, ytViews: 1500, ttFol: 8000, ttViews: 3250, platforms: ["youtube", "tiktok"] },
  { name: "Svarbeuse dariti", market: "LT", nicheLabel: "GTA", niches: ["gaming"], ytSubs: 75000, ytViews: 20000, ttFol: 90000, ttViews: 52500, platforms: ["youtube", "tiktok"] },
  { name: "Robbe", market: "FI", nicheLabel: "Minecraft / Fortnite", niches: ["gaming", "fps-esports"], ytSubs: 310000, ytViews: 200000, ttFol: 60000, ttViews: 185000, platforms: ["youtube", "tiktok"] },
  { name: "KromkaChleba", market: "PL", nicheLabel: "ARK", niches: ["gaming"], ytSubs: 187000, ytViews: 14000, ttFol: 0, ttViews: 0, platforms: ["youtube"] },
  { name: "Kakkuh", market: "FI", nicheLabel: "Minecraft / Fortnite", niches: ["gaming", "fps-esports"], ytSubs: 138000, ytViews: 115000, ttFol: 55000, ttViews: 15000, platforms: ["youtube", "tiktok"] },
  { name: "Max Torstensson", market: "SE", nicheLabel: "Gaming tech", niches: ["tech-reviews"], ytSubs: 0, ytViews: 0, ttFol: 60500, ttViews: 52500, platforms: ["tiktok"] },
  { name: "Jyksedi", market: "FI", nicheLabel: "Minecraft / Fortnite", niches: ["gaming", "fps-esports"], ytSubs: 240000, ytViews: 55000, ttFol: 21000, ttViews: 27500, platforms: ["youtube", "tiktok"] },
];

function nicheMatch(wanted: NicheId[], row: Collab) {
  if (!wanted.length) return true;
  return row.niches.some((n) => wanted.includes(n));
}

function platformMatch(req: DiscoverRequest, row: Collab) {
  const want = req.platforms?.length ? req.platforms : ["youtube", "tiktok", "instagram"];
  return row.platforms.some((p) => want.includes(p));
}

export function prenewCollabCreators(req: DiscoverRequest): ScoredCreator[] {
  const wanted = [...(req.nicheIds ?? []), req.nicheId ?? ""].filter(isNicheId);
  const brand = mergeBrand(req.brand);
  const out: ScoredCreator[] = [];
  for (const row of COLLABS) {
    if (!req.markets.includes(row.market)) continue;
    if (!nicheMatch(wanted, row)) continue;
    if (!platformMatch(req, row)) continue;
    const market = getMarket(row.market);
    const preferYt = (req.platforms ?? []).includes("youtube") && row.ytSubs > 0;
    const followers = preferYt ? row.ytSubs : row.ttFol || row.ytSubs;
    const views = preferYt ? row.ytViews || row.ttViews || 1 : row.ttViews || row.ytViews || 1;
    const text = `${row.name} ${row.nicheLabel} ${row.platforms.join(" ")}`;
    const scored = scoreCreator({
      briefTerms: dictionaryTerms(wanted.length ? wanted : row.niches, market.language),
      text,
      channelCountry: row.market,
      targetMarket: row.market,
      contentInMarketLanguage: true,
      likes: Math.round(views * 0.04),
      comments: Math.round(views * 0.004),
      views: Math.max(views, 1),
      followers: Math.max(followers, 1),
      lastUpload: new Date(),
      madeForKids: false,
      brand,
    });
    const accounts: CreatorAccount[] = [];
    if (row.ytSubs > 0 || row.platforms.includes("youtube")) {
      const q = encodeURIComponent(row.name);
      accounts.push({
        platform: "youtube",
        platformId: row.name,
        handle: row.name,
        url: `https://www.youtube.com/results?search_query=${q}`,
        followers: row.ytSubs || null,
        source: "provider",
      });
    }
    if (row.ttFol > 0 || row.platforms.includes("tiktok")) {
      const q = encodeURIComponent(row.name);
      accounts.push({
        platform: "tiktok",
        platformId: row.name,
        handle: row.name,
        url: `https://www.tiktok.com/search/user?q=${q}`,
        followers: row.ttFol || null,
        source: "provider",
      });
    }
    out.push({
      id: `prenew:${row.market}:${row.name}`,
      displayName: row.name,
      country: row.market,
      languages: [market.language],
      niches: [row.nicheLabel],
      audienceAge: "adult",
      contactRoute: "Prenew past collab — YouTube About / existing outreach workflow (sheet has no emails)",
      accounts,
      recentContent: [
        {
          postId: `${row.name}-avg`,
          url: accounts[0]?.url ?? "",
          titleOrCaption: `${row.nicheLabel} · avg views YT ${row.ytViews || "—"} / TT ${row.ttViews || "—"}`,
          publishedAt: null,
          views: views || null,
          likes: null,
          comments: null,
          language: market.language,
          madeForKids: false,
        },
      ],
      followers: Math.max(followers, 0),
      tier: scored.tier,
      avgViews: views,
      engagementRate: scored.engagementRate,
      fit: scored.fit,
      components: scored.components,
      flags: scored.flags,
      reasons: [
        `Prenew has already collaborated with ${row.name} in ${row.market} (${row.nicheLabel}).`,
        ...ruleReasons({
          niche: scored.components.nicheRelevance,
          audience: scored.components.audienceMatch,
          engagement: scored.components.engagementQuality,
          brand: scored.components.brandFit,
          recent: scored.components.recentActivity,
          hiddenGem: scored.hiddenGem,
          marketLanguage: true,
        }),
      ],
      llmFit: null,
      llmReasons: [],
      scoringMode: "rules only",
      suggestedDeal: scored.suggestedDeal,
      messageDraft: draftMessage({
        name: row.name,
        language: market.language,
        title: row.nicheLabel,
        deal: scored.suggestedDeal,
        brand,
      }),
      hiddenGem: scored.hiddenGem,
      dataDate: "2026-09-26",
      dataSource: "Prenew collaboration history (first-party sheet — not live platform scrape)",
      searchedMarket: row.market,
    });
  }
  return out;
}
