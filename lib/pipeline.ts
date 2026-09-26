import { mergeBrand } from "./brand";
import { extractHandles } from "./handles";
import { llmAvailable, llmFit, llmTranslate } from "./llm";
import { belongsToMarket } from "./localeMatch";
import { getMarket } from "./markets";
import { draftMessage, hoursSaved, ruleReasons } from "./messages";
import { dictionaryTerms, isNicheId, looksLikePcHardware, nichesFromBrief, shouldExcludePcHardware } from "./niches";
import { sampleDiscover } from "./sample";
import { scoreCreator, TIER_BENCHMARK } from "./scoring";
import { prenewCollabCreators } from "./prenewCollabs";
import { discoverViaSearchIndex } from "./webDiscover";
import type { CreatorAccount, DiscoverRequest, DiscoverResponse, MarketTerms, RecentPost, ScoredCreator } from "./types";
import { fetchChannels, fetchVideos, searchRecentVideos, youtubeUrl, type YtChannel, type YtVideoHit, type YtVideoStats } from "./youtube";

function youtubeKey(reqKey?: string) {
  const fromEnv = (process.env.YOUTUBE_API_KEY ?? "").trim();
  const fromReq = (reqKey ?? "").trim();
  return fromEnv || fromReq || "";
}

async function attachWebDiscovery(req: DiscoverRequest, result: DiscoverResponse): Promise<DiscoverResponse> {
  const collabs = prenewCollabCreators(req);
  let creators = result.creators;
  let notes = result.notes;
  if (req.webDiscover !== false) {
    const web = await discoverViaSearchIndex(req);
    creators = [...creators, ...web.creators];
    notes = [...notes, ...web.notes];
  }
  if (collabs.length) {
    const seen = new Set(creators.map((c) => c.displayName.toLowerCase()));
    for (const c of collabs) {
      if (!seen.has(c.displayName.toLowerCase())) creators.push(c);
    }
    notes = [
      ...notes,
      "Includes Prenew’s own collaboration history for this market/niche (country, subs/followers, avg views, game/tech niche). Not scraped from TikTok/Instagram.",
    ];
  }
  creators = [...creators].sort((a, b) => b.fit - a.fit);
  return {
    ...result,
    creators,
    hoursSavedEstimate: hoursSaved(creators.length),
    notes,
  };
}

export async function runDiscover(req: DiscoverRequest): Promise<DiscoverResponse> {
  const mode = req.mode ?? "auto";
  const key = youtubeKey(req.youtubeApiKey);
  if (mode === "sample" || (mode === "auto" && !key)) {
    return attachWebDiscovery(req, sampleDiscover(req.brief, req.markets, req.nicheIds));
  }
  if (!key) {
    throw new Error(
      "Live YouTube needs an API key. Paste it in the form, or add YOUTUBE_API_KEY to .env.local and restart the dev server.",
    );
  }

  try {
    return await attachWebDiscovery(req, await runLiveDiscover(req, key));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (/blocked search\.list|V3DataSearchService\.List are blocked/i.test(message)) {
      const sample = sampleDiscover(req.brief, req.markets, req.nicheIds);
      sample.notes = [
        "YouTube search.list is blocked on this API key — live discovery cannot run until Google Cloud allows it.",
        "Enable YouTube Data API v3, set API restrictions to YouTube Data API v3 or Don't restrict key, and set Application restrictions to None (or IP) for this local server.",
        "Showing labelled SAMPLE results so the workflow still works.",
        ...sample.notes,
      ];
      return attachWebDiscovery(req, sample);
    }
    throw e;
  }
}

async function runLiveDiscover(req: DiscoverRequest, key: string): Promise<DiscoverResponse> {
  const brand = mergeBrand(req.brand);
  const fromIds = [...(req.nicheIds ?? []), req.nicheId ?? ""].filter(isNicheId);
  const niches = fromIds.length ? fromIds : nichesFromBrief(req.brief);
  const publishedAfter = new Date(Date.now() - req.timeWindowDays * 86_400_000).toISOString();
  const termsPerMarket: MarketTerms[] = [];
  let units = 0;
  const notes: string[] = [];
  const allCreators: ScoredCreator[] = [];
  const seen = new Set<string>();

  for (const code of req.markets) {
    const market = getMarket(code);
    let terms = dictionaryTerms(niches, market.language);
    let source: MarketTerms["source"] = "dictionary";
    if (llmAvailable() && fromIds.length === 0) {
      const translated = await llmTranslate(req.brief, market.name, market.languageName);
      if (translated?.terms.length) {
        terms = translated.terms;
        source = "llm";
      }
    }
    termsPerMarket.push({
      country: code,
      language: market.language,
      terms,
      niche: niches[0],
      source,
    });

    const q =
      market.language === "vi"
        ? `${terms.join(" ")} Việt Nam`
        : terms.join(" ");
    const search = await searchRecentVideos({
      key,
      q,
      regionCode: market.ytRegion,
      relevanceLanguage: market.language,
      publishedAfter,
      maxResults: 25,
    });
    units += search.units;

    const grouped = new Map<string, YtVideoHit[]>();
    for (const v of search.items) {
      const list = grouped.get(v.channelId) ?? [];
      if (list.length < 5) list.push(v);
      grouped.set(v.channelId, list);
    }
    const channelIds = [...grouped.keys()];
    const chRes = await fetchChannels(key, channelIds);
    units += chRes.units;
    const videoIds = [...grouped.values()].flat().map((v) => v.videoId);
    const vRes = await fetchVideos(key, videoIds);
    units += vRes.units;
    const videoById = new Map(vRes.items.map((v) => [v.id, v]));
    const channelById = new Map(chRes.items.map((c) => [c.id, c]));

    const marketCreators: ScoredCreator[] = [];
    for (const [channelId, hits] of grouped) {
      if (seen.has(channelId)) continue;
      const channel = channelById.get(channelId);
      if (!channel) continue;
      const stats = hits.map((h) => videoById.get(h.videoId)).filter(Boolean) as YtVideoStats[];
      const followers = channel.subscriberCount;
      const includeMacro = req.includeMacro !== false;
      const inRange =
        followers <= 0 ||
        (followers < req.sizeMin && req.includeNano) ||
        (followers >= req.sizeMin && followers <= req.sizeMax) ||
        (includeMacro && followers > req.sizeMax);
      if (!inRange) continue;
      const blob = `${channel.title} ${channel.description} ${hits.map((h) => h.title).join(" ")} ${stats.map((s) => s.title).join(" ")}`;
      if (
        !belongsToMarket({
          channelCountry: channel.country ?? null,
          targetMarket: code,
          language: market.language,
          text: blob,
        })
      ) {
        continue;
      }
      if (shouldExcludePcHardware(niches) && looksLikePcHardware(blob)) {
        continue;
      }

      seen.add(channelId);
      const creator = buildCreator({
        channel,
        stats,
        hits,
        briefTerms: terms,
        marketCode: code,
        marketLang: market.language,
        brand,
        dataDate: new Date().toISOString().slice(0, 10),
      });
      marketCreators.push(creator);
    }

    marketCreators.sort((a, b) => b.fit - a.fit);
    const top = marketCreators.slice(0, 30);
    if (llmAvailable()) {
      for (const c of top) {
        const fit = await llmFit({
          brandName: brand.name,
          pitch: brand.pitch,
          goodWords: brand.goodFitWords,
          competitors: brand.competitors,
          riskWords: brand.riskWords,
          name: c.displayName,
          platform: "youtube",
          country: c.country,
          followers: c.followers,
          er: c.engagementRate,
          benchmark: TIER_BENCHMARK[c.tier],
          titles: c.recentContent.map((p) => p.titleOrCaption),
        });
        if (fit) {
          c.llmFit = fit.fit;
          c.llmReasons = fit.reasons;
          c.scoringMode = "rules+llm";
          c.components.nicheRelevance = Math.round(c.components.nicheRelevance * 0.5 + fit.fit * 0.5);
          c.fit = Math.round(c.fit * 0.7 + fit.fit * 0.3);
          if (fit.risks.length) c.flags = [...new Set([...c.flags, ...fit.risks])];
          c.hiddenGem = c.fit >= 70 && c.followers < 50_000 && c.flags.length === 0;
        }
      }
    }
    allCreators.push(...marketCreators);
  }

  allCreators.sort((a, b) => b.fit - a.fit);
  notes.push("YouTube Data API v3 live search. Linked TikTok/Instagram handles come from public channel descriptions only.");
  notes.push("No messages are sent automatically. Marketer must edit and send.");
  if (!llmAvailable()) notes.push("OPENAI_API_KEY missing — query translation used the niche dictionary; fit is rules-only.");

  return {
    runId: `live-${Date.now()}`,
    brief: req.brief,
    createdAt: new Date().toISOString(),
    mode: "live",
    termsPerMarket,
    creators: allCreators,
    apiUnitsUsed: units,
    hoursSavedEstimate: hoursSaved(allCreators.length),
    notes,
  };
}

function buildCreator(opts: {
  channel: YtChannel;
  stats: YtVideoStats[];
  hits: YtVideoHit[];
  briefTerms: string[];
  marketCode: string;
  marketLang: string;
  brand: ReturnType<typeof mergeBrand>;
  dataDate: string;
}): ScoredCreator {
  const { channel, stats, hits } = opts;
  const views = avg(stats.map((s) => s.views)) || 1;
  const likes = avg(stats.map((s) => s.likes));
  const comments = avg(stats.map((s) => s.comments));
  const last = stats
    .map((s) => (s.publishedAt ? new Date(s.publishedAt) : null))
    .filter(Boolean)
    .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as Date | undefined;
  const madeForKids = stats.some((s) => s.madeForKids);
  const text = `${channel.title} ${channel.description} ${channel.keywords ?? ""} ${stats.map((s) => s.title).join(" ")}`;
  const contentLangMatch =
    stats.some((s) => (s.defaultLanguage ?? "").toLowerCase().startsWith(opts.marketLang)) ||
    (channel.country ?? "").toUpperCase() === opts.marketCode;
  const scored = scoreCreator({
    briefTerms: opts.briefTerms,
    text,
    channelCountry: channel.country ?? null,
    targetMarket: opts.marketCode,
    contentInMarketLanguage: contentLangMatch,
    likes,
    comments,
    views,
    followers: channel.subscriberCount,
    lastUpload: last ?? null,
    madeForKids,
    brand: opts.brand,
  });
  const handles = extractHandles(channel.description);
  const accounts: CreatorAccount[] = [
    {
      platform: "youtube",
      platformId: channel.id,
      handle: channel.customUrl ?? channel.id,
      url: youtubeUrl(channel),
      followers: channel.subscriberCount || null,
      source: "api",
    },
  ];
  if (handles.tiktok) {
    accounts.push({
      platform: "tiktok",
      platformId: handles.tiktok,
      handle: handles.tiktok,
      url: `https://www.tiktok.com/${handles.tiktok}`,
      followers: null,
      source: "linked",
    });
  }
  if (handles.instagram) {
    accounts.push({
      platform: "instagram",
      platformId: handles.instagram,
      handle: handles.instagram,
      url: `https://www.instagram.com/${handles.instagram}`,
      followers: null,
      source: "linked",
    });
  }
  const posts: RecentPost[] = (stats.length ? stats : hits).map((s) => {
    const asStats = "views" in s ? (s as YtVideoStats) : null;
    const asHit = "videoId" in s ? (s as YtVideoHit) : null;
    const id = asStats?.id ?? asHit?.videoId ?? "";
    return {
      postId: id,
      url: `https://www.youtube.com/watch?v=${id}`,
      titleOrCaption: asStats?.title ?? asHit?.title ?? "",
      publishedAt: asStats?.publishedAt ?? asHit?.publishedAt ?? null,
      views: asStats?.views ?? null,
      likes: asStats?.likes ?? null,
      comments: asStats?.comments ?? null,
      language: asStats?.defaultLanguage ?? opts.marketLang,
      madeForKids: asStats?.madeForKids ?? false,
    };
  });
  const title = posts[0]?.titleOrCaption || channel.title;
  const reasons = ruleReasons({
    niche: scored.components.nicheRelevance,
    audience: scored.components.audienceMatch,
    engagement: scored.components.engagementQuality,
    brand: scored.components.brandFit,
    recent: scored.components.recentActivity,
    hiddenGem: scored.hiddenGem,
    marketLanguage: true,
  });
  return {
    id: channel.id,
    displayName: channel.title,
    country: channel.country ?? null,
    languages: [opts.marketLang],
    niches: ["PC building"],
    audienceAge: madeForKids ? "kids" : "adult",
    contactRoute: "YouTube About page (business email) — tool links there, does not scrape private contact",
    accounts,
    recentContent: posts,
    followers: channel.subscriberCount,
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
      name: channel.title,
      language: opts.marketLang,
      title,
      deal: scored.suggestedDeal,
      brand: opts.brand,
    }),
    hiddenGem: scored.hiddenGem,
    dataDate: opts.dataDate,
    dataSource: "YouTube Data API v3",
    searchedMarket: opts.marketCode,
  };
}

function avg(n: number[]) {
  if (!n.length) return 0;
  return Math.round(n.reduce((a, b) => a + b, 0) / n.length);
}
