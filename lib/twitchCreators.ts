import { dictionaryTerms, isNicheId, nichesFromBrief, type NicheId } from "./niches";
import { getMarket } from "./markets";
import { scoreVisibleProfile } from "./scoreProfile";
import { discoverTwitchByNiche, twitchCategoryQueries, twitchConfigured } from "./twitch";
import type { DiscoverRequest, ScoredCreator } from "./types";

/**
 * Live Twitch discovery via directory categories + streams/VODs (not channel-name search).
 */
export async function twitchDiscoverCreators(
  req: DiscoverRequest,
): Promise<{ creators: ScoredCreator[]; notes: string[] }> {
  const notes: string[] = [];
  if (!twitchConfigured()) return { creators: [], notes };

  const fromIds = [...(req.nicheIds ?? []), req.nicheId ?? ""].filter(isNicheId) as NicheId[];
  const niches = fromIds.length ? fromIds : nichesFromBrief(req.brief);
  const restrictCountry = Boolean(req.markets.length && req.localOnly !== false);
  const markets = req.markets.length ? req.markets.slice(0, 3) : ["WW"];
  const seen = new Set<string>();
  const creators: ScoredCreator[] = [];

  for (const code of markets) {
    const worldwide = code === "WW";
    const market = worldwide
      ? { language: "en", name: "Worldwide" }
      : getMarket(code);
    const queries = twitchCategoryQueries(niches);
    const channels = await discoverTwitchByNiche({
      queries,
      language: worldwide ? undefined : market.language,
      first: 30,
    });
    for (const ch of channels) {
      const key = `twitch:${ch.login.toLowerCase()}`;
      if (seen.has(key)) continue;
      // No country on Twitch — use broadcaster language as the proxy when restricting.
      if (restrictCountry && !worldwide && ch.language && ch.language !== market.language) continue;
      seen.add(key);
      const creator = scoreVisibleProfile({
          name: ch.displayName,
          platform: "twitch",
          bio: [ch.title, ch.gameName, ch.lastVideoTitle].filter((x): x is string => Boolean(x)).join(" · "),
          captions: [ch.title, ch.lastVideoTitle].filter((x): x is string => Boolean(x)),
          followers: 0,
          likes: 0,
          comments: 0,
          views: Math.max(1, ch.avgViews),
          country: null,
          market: worldwide ? "WW" : code,
          language: ch.language || market.language,
          briefTerms: dictionaryTerms(niches, market.language),
          source: "api",
          url: `https://www.twitch.tv/${ch.login}`,
          handle: ch.login,
          brand: req.brand,
        });
      creator.avgViews = ch.avgViews;
      creator.peakLiveViewers = ch.peakLiveViewers;
      if (ch.videoUrl && creator.recentContent[0]) {
        creator.recentContent[0] = {
          ...creator.recentContent[0],
          url: ch.videoUrl,
          views: ch.avgViews || null,
        };
      }
      creator.reasons = [
        ch.isLive
          ? `Twitch: ${ch.avgViews.toLocaleString()} avg VOD/clip views · ${ch.peakLiveViewers.toLocaleString()} peak live (current stream CCV vs recent VOD/clip views). Followers are not on the app token.`
          : `Twitch: ${ch.avgViews.toLocaleString()} avg VOD/clip views · ${ch.peakLiveViewers.toLocaleString()} peak recorded views (Helix has no historic live CCV while offline). Followers are not on the app token.`,
        ...creator.reasons,
      ];
      creators.push(creator);
    }
  }

  if (creators.length) {
    notes.push(
      `Twitch Helix: ${creators.length} streamer(s) from niche categories (live streams / VODs in those games), not people whose username contains the search word.`,
    );
  } else {
    notes.push(
      "Twitch found no live streams or VODs in this niche’s directory categories. Try Gaming / FPS, or drop the country language filter.",
    );
  }
  return { creators, notes };
}
