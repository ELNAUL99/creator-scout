import { dictionaryTerms, isNicheId, nichesFromBrief } from "./niches";
import { listOptIns, type OptInRecord } from "./optInStore";
import { scoreVisibleProfile } from "./scoreProfile";
import type { DiscoverRequest, Platform, ScoredCreator } from "./types";
import { getMarket } from "./markets";

function toCreator(row: OptInRecord, req: DiscoverRequest): ScoredCreator {
  const fromIds = [...(req.nicheIds ?? []), req.nicheId ?? ""].filter(isNicheId);
  const niches = fromIds.length ? fromIds : nichesFromBrief(req.brief);
  const marketCode = req.markets[0] ?? "WW";
  const market = getMarket(marketCode);
  const handle = row.handle.replace(/^@/, "");
  const url =
    row.platform === "tiktok" ? `https://www.tiktok.com/@${handle}` : `https://www.instagram.com/${handle}/`;
  const creator = scoreVisibleProfile({
    name: row.displayName || handle,
    platform: row.platform,
    bio: row.bio,
    captions: [row.bio].filter(Boolean),
    followers: row.followers ?? 0,
    likes: 0,
    comments: 0,
    views: 1,
    country: null,
    market: marketCode,
    language: market.language,
    briefTerms: dictionaryTerms(niches, market.language),
    source: "opt_in",
    url,
    handle: row.platform === "tiktok" ? `@${handle}` : handle,
    brand: req.brand,
  });
  creator.reasons = [
    `Official ${row.platform} ${row.via === "oauth" ? "login" : "opt-in"} — live profile fields from the connected account, not the collab sheet.`,
    ...creator.reasons,
  ];
  creator.dataSource =
    row.via === "oauth"
      ? `Connected ${row.platform} (official OAuth)`
      : `Creator opt-in (${row.platform})`;
  return creator;
}

export async function connectedOptInCreators(req: DiscoverRequest): Promise<ScoredCreator[]> {
  const want = new Set<Platform>(req.platforms?.length ? req.platforms : ["tiktok", "instagram"]);
  const rows = await listOptIns(req.workspaceId ?? null);
  return rows.filter((r) => want.has(r.platform)).map((r) => toCreator(r, req));
}
