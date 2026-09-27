import { dictionaryTerms, isNicheId, nichesFromBrief, type NicheId } from "./niches";
import { getMarket } from "./markets";
import { scoreVisibleProfile } from "./scoreProfile";
import { searchTwitchChannels, twitchConfigured } from "./twitch";
import type { DiscoverRequest, ScoredCreator } from "./types";

/**
 * Live Twitch discovery via Helix Search Channels. Unlike TikTok/Instagram,
 * Twitch is genuinely searchable with an app token. Follower counts aren't
 * available via app token, so results carry followers=0 (kept only under "Any size").
 * Twitch has no country field — broadcaster language is used as the country proxy.
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
    const enTerm = dictionaryTerms(niches, "en")[0] ?? "gaming";
    const localTerms = dictionaryTerms(niches, market.language);
    const query = worldwide
      ? enTerm
      : localTerms.find((t) => t.toLowerCase() !== enTerm.toLowerCase()) ?? localTerms[0] ?? enTerm;
    const channels = await searchTwitchChannels(query, 30);
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
      `Twitch Helix: ${creators.length} channel(s) with a VOD, clip, or live stream. Cards show avg views and peak live/recorded viewers (not followers).`,
    );
  } else {
    notes.push(
      "Twitch (Helix) returned no channels for this niche/country. Try a broader niche, Any size, or fewer country restrictions.",
    );
  }
  return { creators, notes };
}
