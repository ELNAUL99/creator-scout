import { getMarket } from "./markets";
import { dictionaryTerms, isNicheId, nichesFromBrief, type NicheId } from "./niches";
import { scoreVisibleProfile } from "./scoreProfile";
import type { DiscoverRequest, ScoredCreator } from "./types";
import { businessDiscovery, instagramConfigured } from "./instagram";
import { hitsFromSearchItems, searchApiConfigured, searchIndexedWeb } from "./webSearch";

export async function discoverViaSearchIndex(req: DiscoverRequest): Promise<{ creators: ScoredCreator[]; notes: string[] }> {
  const notes: string[] = [];
  const fromIds = [...(req.nicheIds ?? []), req.nicheId ?? ""].filter(isNicheId) as NicheId[];
  const niches = fromIds.length ? fromIds : nichesFromBrief(req.brief);
  const creators: ScoredCreator[] = [];
  const seen = new Set<string>();

  if (!searchApiConfigured()) {
    notes.push(
      "TikTok/Instagram handles: add GOOGLE_CSE_KEY + GOOGLE_CSE_CX (or BRAVE_SEARCH_API_KEY) to run site: searches. No platform scraping.",
    );
    notes.push("Production swaps this step for a licensed creator-data API; scoring, Scout Lens, and Instagram Business Discovery stay.");
    return { creators, notes };
  }

  const markets = req.markets.slice(0, 3);
  const sites = (
    [
      req.platforms.includes("tiktok") ? "tiktok.com" : null,
      req.platforms.includes("instagram") ? "instagram.com" : null,
    ] as const
  ).filter(Boolean) as ("tiktok.com" | "instagram.com")[];
  if (!sites.length) {
    notes.push("TikTok/Instagram not in this run — site: discovery skipped.");
    return { creators, notes };
  }
  let provider = "search API";
  for (const code of markets) {
    const market = getMarket(code);
    const term = dictionaryTerms(niches, market.language)[0] ?? req.brief;
    for (const site of sites) {
      const q = `site:${site} "${term}"`;
      const found = await searchIndexedWeb(q);
      if (found.provider) provider = found.provider;
      const hits = hitsFromSearchItems(found.items);
      for (const hit of hits.slice(0, 6)) {
        const key = `${hit.platform}:${hit.handle.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        let followers = 0;
        let likes = 0;
        let comments = 0;
        let bio = hit.snippet;
        let name = hit.handle;
        let captions = [hit.snippet];
        let source: ScoredCreator["accounts"][0]["source"] = "web";
        if (hit.platform === "instagram" && instagramConfigured()) {
          const ig = await businessDiscovery(hit.handle);
          if (ig) {
            followers = ig.followers;
            likes = ig.likes;
            comments = ig.comments;
            bio = `${ig.biography} ${hit.snippet}`;
            name = ig.name;
            captions = ig.captions.length ? ig.captions : captions;
            source = "api";
          }
        }
        const includeMacro = req.includeMacro !== false;
        if (followers > 0) {
          if (followers < req.sizeMin && !req.includeNano) continue;
          if (followers > req.sizeMax && !includeMacro) continue;
        }
        creators.push(
          scoreVisibleProfile({
            name,
            platform: hit.platform,
            bio,
            captions,
            followers,
            likes,
            comments,
            views: Math.max(likes * 12, 1),
            country: code,
            market: code,
            language: market.language,
            briefTerms: dictionaryTerms(niches, market.language),
            source,
            url: hit.url,
            handle: hit.platform === "tiktok" ? `@${hit.handle}` : hit.handle,
          }),
        );
      }
    }
  }

  notes.push(
    `TikTok/Instagram handles from ${provider} site: queries (Google-indexed public profiles). We do not scrape TikTok or Instagram search.`,
  );
  if (instagramConfigured()) {
    notes.push("Instagram follower/post stats via Graph API Business Discovery (free; needs a Meta app + IG business account).");
  } else {
    notes.push("Set INSTAGRAM_GRAPH_TOKEN and INSTAGRAM_BUSINESS_ID for live Instagram stats on discovered usernames.");
  }
  notes.push("Scout Lens scores a TikTok/Instagram profile you already have open — one at a time, your session, no crawl.");
  notes.push("Production swaps search-engine discovery for a licensed data API; everything else stays.");
  return { creators, notes };
}
