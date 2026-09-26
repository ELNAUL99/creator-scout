import { dictionaryTerms, isNicheId, nichesFromBrief } from "./niches";
import { listLensCaptures } from "./lensStore";
import { getMarket } from "./markets";
import { scoreVisibleProfile } from "./scoreProfile";
import type { DiscoverRequest, Platform, ScoredCreator } from "./types";

export async function lensCaptureCreators(req: DiscoverRequest): Promise<ScoredCreator[]> {
  const want = new Set<Platform>(req.platforms?.length ? req.platforms : ["youtube", "tiktok", "instagram"]);
  const fromIds = [...(req.nicheIds ?? []), req.nicheId ?? ""].filter(isNicheId);
  const niches = fromIds.length ? fromIds : nichesFromBrief(req.brief);
  const marketCode = req.markets[0] ?? "FI";
  const market = getMarket(marketCode);
  const rows = await listLensCaptures();
  return rows
    .filter((r) => want.has(r.platform))
    .map((r) => {
      const creator = scoreVisibleProfile({
        name: r.name,
        platform: r.platform,
        bio: r.bio,
        captions: r.captions,
        followers: r.followers,
        likes: r.likes,
        comments: r.comments,
        views: r.views,
        country: r.country,
        market: marketCode,
        language: market.language,
        briefTerms: dictionaryTerms(niches, market.language),
        source: "extension",
        url: r.url,
        handle: r.handle,
      });
      creator.reasons = [
        "Scout Lens capture from a profile you opened in the browser (visible fields only).",
        ...creator.reasons,
      ];
      return creator;
    });
}
