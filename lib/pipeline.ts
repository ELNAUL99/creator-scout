import { mergeBrand } from "./brand";
import { extractHandles } from "./handles";
import { llmAvailable, llmFit, llmTranslate } from "./llm";
import { matchesSelectedCountries } from "./localeMatch";
import { getMarket } from "./markets";
import { draftMessage, hoursSaved, ruleReasons } from "./messages";
import { dictionaryTerms, isNicheId, looksLikePcHardware, nichesFromBrief, shouldExcludePcHardware, buildTermsPerMarket } from "./niches";
import { sampleDiscover } from "./sample";
import { scoreCreator, TIER_BENCHMARK } from "./scoring";
import { connectedOptInCreators } from "./optInCreators";
import { getIgConnection } from "./igConnectionStore";
import { businessDiscovery, envIgAuth } from "./instagram";
import { lensCaptureCreators } from "./lensCreators";
import { prenewCollabCreators } from "./prenewCollabs";
import { presetCatalogCreators } from "./presetCatalog";
import { scoreVisibleProfile } from "./scoreProfile";
import { filterCreatorsBySize, followersMatchSize, sizeRangeActive } from "./sizeRange";
import { discoverViaSearchIndex } from "./webDiscover";
import { twitchDiscoverCreators } from "./twitchCreators";
import { twitchConfigured } from "./twitch";
import type { CreatorAccount, DiscoverRequest, DiscoverResponse, MarketTerms, RecentPost, ScoredCreator } from "./types";
import { fetchChannels, fetchVideos, searchRecentVideos, youtubeUrl, type YtChannel, type YtVideoHit, type YtVideoStats } from "./youtube";

function youtubeKey(reqKey?: string) {
  const fromEnv = (process.env.YOUTUBE_API_KEY ?? "").trim();
  const fromReq = (reqKey ?? "").trim();
  return fromEnv || fromReq || "";
}

function mergeCreators(base: ScoredCreator[], extra: ScoredCreator[]) {
  const ids = new Set(base.map((c) => c.id.toLowerCase()));
  const names = new Set(base.map((c) => c.displayName.toLowerCase()));
  for (const c of extra) {
    if (ids.has(c.id.toLowerCase()) || names.has(c.displayName.toLowerCase())) continue;
    base.push(c);
    ids.add(c.id.toLowerCase());
    names.add(c.displayName.toLowerCase());
  }
  return base;
}

function termsForMarkets(req: DiscoverRequest): MarketTerms[] {
  const fromIds = [...(req.nicheIds ?? []), req.nicheId ?? ""].filter(isNicheId);
  const niches = fromIds.length ? fromIds : nichesFromBrief(req.brief);
  return buildTermsPerMarket(niches, req.markets);
}

function emptyLive(req: DiscoverRequest, notes: string[]): DiscoverResponse {
  return {
    runId: `live-${Date.now()}`,
    brief: req.brief,
    createdAt: new Date().toISOString(),
    mode: "live",
    termsPerMarket: termsForMarkets(req),
    creators: [],
    apiUnitsUsed: 0,
    hoursSavedEstimate: 0,
    notes,
  };
}

async function expandSocialsFromYoutube(req: DiscoverRequest, fromYt: ScoredCreator[]) {
  const extra: ScoredCreator[] = [];
  const notes: string[] = [];
  const wantIg = (req.platforms ?? []).includes("instagram");
  const wantTt = (req.platforms ?? []).includes("tiktok");
  if (!wantIg && !wantTt) return { extra, notes };

  const conn = await getIgConnection(req.workspaceId ?? null);
  const igAuth =
    conn?.accessToken && conn.igUserId
      ? { token: conn.accessToken, igUserId: conn.igUserId }
      : envIgAuth();

  let igLookedUp = 0;
  const seen = new Set<string>();
  for (const c of fromYt) {
    for (const a of c.accounts) {
      const handle = a.handle.replace(/^@/, "");
      if (a.platform === "instagram" && wantIg) {
        const key = `instagram:${handle.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const ig = igAuth ? await businessDiscovery(handle, igAuth) : null;
        if (ig) igLookedUp += 1;
        const followers = ig?.followers ?? 0;
        if (followers > 0 && !followersMatchSize(followers, req.sizeMin, req.sizeMax)) continue;
        if (followers <= 0 && sizeRangeActive(req.sizeMin, req.sizeMax)) continue;
        extra.push(
          scoreVisibleProfile({
            name: ig?.name ?? handle,
            platform: "instagram",
            bio: ig?.biography ?? `Linked from YouTube channel ${c.displayName}`,
            captions: ig?.captions?.length ? ig.captions : [`Found on YouTube: ${c.displayName}`],
            followers,
            likes: ig?.likes ?? 0,
            comments: ig?.comments ?? 0,
            views: Math.max((ig?.likes ?? 0) * 12, 1),
            country: c.country,
            market: c.searchedMarket,
            language: c.languages[0],
            briefTerms: [],
            source: ig ? "api" : "linked",
            url: `https://www.instagram.com/${handle}/`,
            handle,
            brand: req.brand,
          }),
        );
      }
      if (a.platform === "tiktok" && wantTt) {
        const key = `tiktok:${handle.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (sizeRangeActive(req.sizeMin, req.sizeMax)) continue;
        extra.push(
          scoreVisibleProfile({
            name: handle,
            platform: "tiktok",
            bio: `Linked in YouTube description of ${c.displayName}. TikTok Login Kit cannot fetch other profiles.`,
            captions: [`Found on YouTube: ${c.displayName}`],
            followers: 0,
            likes: 0,
            comments: 0,
            views: 1,
            country: c.country,
            market: c.searchedMarket,
            language: c.languages[0],
            briefTerms: [],
            source: "linked",
            url: `https://www.tiktok.com/@${handle}`,
            handle: `@${handle}`,
            brand: req.brand,
          }),
        );
      }
    }
  }
  if (extra.length) {
    notes.push(
      `Added ${extra.length} TikTok/Instagram identit${extra.length === 1 ? "y" : "ies"} linked from YouTube channel text (not a TikTok/Instagram crawl).`,
    );
  }
  if (wantIg && igAuth) {
    notes.push(
      igLookedUp
        ? `Instagram Graph Business Discovery filled stats for ${igLookedUp} public username(s) using the connected IG professional account.`
        : "Instagram is connected, but Business Discovery returned no stats (username must be a public professional/creator account).",
    );
  } else if (wantIg) {
    notes.push(
      "Connect Instagram (professional/creator) so we can look up other public IG usernames via Graph Business Discovery. Logging in does not scrape Instagram search.",
    );
  }
  if (wantTt) {
    notes.push(
      "TikTok Login Kit only returns the account you signed in with. There is no official TikTok search/crawl for other creators — use Scout Lens on a profile, or site: search if a search API key is set.",
    );
  }
  return { extra, notes };
}

async function attachLiveSources(req: DiscoverRequest, result: DiscoverResponse): Promise<DiscoverResponse> {
  let creators = [...result.creators];
  let notes = [...result.notes];
  const platforms = req.platforms?.length ? req.platforms : ["youtube", "tiktok", "instagram"];
  const restrictCountry = Boolean(req.markets.length && req.localOnly !== false);

  if (!restrictCountry) {
    const socials = await expandSocialsFromYoutube(req, creators);
    creators = mergeCreators(creators, socials.extra);
    notes = [...notes, ...socials.notes];
  }

  if (
    req.webDiscover !== false &&
    (platforms.includes("tiktok") || platforms.includes("instagram")) &&
    !restrictCountry
  ) {
    const web = await discoverViaSearchIndex(req);
    creators = mergeCreators(creators, web.creators);
    notes = [...notes, ...web.notes];
  }

  // Live Twitch discovery (Helix). Runs even when country is restricted because
  // Twitch results carry a language we filter on. Needs TWITCH_CLIENT_ID/SECRET.
  if (platforms.includes("twitch") && twitchConfigured()) {
    const tw = await twitchDiscoverCreators(req);
    creators = mergeCreators(creators, tw.creators);
    notes = [...notes, ...tw.notes];
  }

  const connected = await connectedOptInCreators(req);
  if (connected.length) {
    creators = mergeCreators(creators, connected);
    notes.push(
      `Included ${connected.length} creator(s) from official TikTok/Instagram connect (your workspace), scored against this brief.`,
    );
  } else if (platforms.includes("tiktok") || platforms.includes("instagram")) {
    notes.push(
      "No connected TikTok/Instagram login in this workspace. Connect still only adds the account that signed in.",
    );
  }

  const lens = await lensCaptureCreators(req);
  if (lens.length) {
    creators = mergeCreators(creators, lens);
    notes.push(`Included ${lens.length} Scout Lens capture(s) from profiles you opened in the browser.`);
  }

  if (req.includePresetCatalog !== false) {
    const preset = presetCatalogCreators(req);
    if (preset.length) {
      creators = mergeCreators(creators, preset);
      notes.push(
        `Included ${preset.length} fictional preset creator(s) (100 per TikTok, Instagram, Facebook, Twitch, mixed countries/sizes/niches). Labelled demo — not a live crawl.`,
      );
    }
  }

  if (req.includePrenewCollabs) {
    const collabs = prenewCollabCreators(req);
    const before = creators.length;
    creators = mergeCreators(creators, collabs);
    if (creators.length > before) {
      notes.push(
        "Also listing Prenew collab-sheet names you ticked on. That sheet is first-party history, not live platform research.",
      );
    }
  }

  creators = filterCreatorsBySize(creators, req.sizeMin, req.sizeMax).sort((a, b) => b.fit - a.fit);
  notes.unshift(
    "YouTube is live API search. TikTok/Instagram/Facebook/Twitch catalog rows are a labelled demo preset unless you also have site:, Graph, Lens, or Connect. Connect is still not a crawl.",
  );
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
  const wantYt = (req.platforms ?? ["youtube"]).includes("youtube");

  if (mode === "sample") {
    return attachLiveSources(req, sampleDiscover(req.brief, req.markets, req.nicheIds, req.brand));
  }

  if (wantYt && key) {
    try {
      return await attachLiveSources(req, await runLiveDiscover(req, key));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (/blocked search\.list|V3DataSearchService\.List are blocked/i.test(message)) {
        const blocked = await attachLiveSources(
          req,
          emptyLive(req, [
            "YouTube search.list is blocked on this API key — live YouTube discovery cannot run until Google Cloud allows it.",
            "Enable YouTube Data API v3, API restrictions = YouTube Data API v3 (or unrestricted), Application restrictions = None (or IP) for this server.",
            "Not substituting the collab sheet or sample channels. Connected TikTok/Instagram, Lens, and site: search still run.",
          ]),
        );
        blocked.error = message;
        return blocked;
      }
      throw e;
    }
  }

  const notes: string[] = [];
  if (wantYt && !key) {
    notes.push(
      "YouTube API key is empty in this environment. Put YOUTUBE_API_KEY in .env.local (local) or Vercel env (production) and restart. Discovery will not invent sheet/sample channels.",
    );
  }
  if (!wantYt) notes.push("YouTube is unchecked, so YouTube Data API was not queried.");
  const result = await attachLiveSources(req, emptyLive(req, notes));
  if (wantYt && !key) {
    result.error = notes[0];
  }
  return result;
}

async function runLiveDiscover(req: DiscoverRequest, key: string): Promise<DiscoverResponse> {
  const brand = mergeBrand(req.brand);
  const fromIds = [...(req.nicheIds ?? []), req.nicheId ?? ""].filter(isNicheId);
  const niches = fromIds.length ? fromIds : nichesFromBrief(req.brief);
  let units = 0;
  const notes: string[] = [];
  const allCreators: ScoredCreator[] = [];
  const seen = new Set<string>();

  notes.push(
    "Search uses your niche plus a short brief. Full brand name / business / references are scored on Scout Lens, not this list.",
  );

  if (req.markets.length) {
    notes.push(
      req.localOnly !== false
        ? "Showing creators whose YouTube country matches your selection. Unknown-country channels only stay if the content is in that language."
        : "Selected countries are used for local search terms; results can include other countries.",
    );
  } else {
    notes.push("No country selected — worldwide YouTube search.");
  }
  const restrictCountry = Boolean(req.markets.length && req.localOnly !== false);
  const passCodes = restrictCountry ? req.markets : ["WW"];
  for (const code of passCodes) {
    const worldwide = code === "WW";
    const market = worldwide
      ? { language: "en", ytRegion: "", name: "Worldwide", languageName: "English" }
      : getMarket(code);
    const terms = dictionaryTerms(niches, market.language);
    if (llmAvailable() && fromIds.length === 0 && req.brand?.pitch) {
      const translated = await llmTranslate(req.brand.pitch, market.name, market.languageName);
      if (translated?.terms.length) terms.push(...translated.terms);
    }

    const q = [terms[0], req.brand?.pitch?.split(/\s+/).slice(0, 4).join(" ")].filter(Boolean).join(" ") || req.brief.split(",")[0]?.trim() || "gameplay";
    let search = await searchRecentVideos({
      key,
      q,
      regionCode: worldwide ? undefined : market.ytRegion,
      order: "relevance",
      maxResults: 50,
    });
    units += search.units;
    if (search.items.length === 0 && terms[1]) {
      const retry = await searchRecentVideos({
        key,
        q: terms[1],
        regionCode: worldwide ? undefined : market.ytRegion,
        order: "relevance",
        maxResults: 50,
      });
      units += retry.units;
      search = retry;
    }

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
    let droppedSize = 0;
    let droppedCountry = 0;
    for (const [channelId, hits] of grouped) {
      if (seen.has(channelId)) continue;
      const channel = channelById.get(channelId);
      if (!channel) continue;
      const stats = hits.map((h) => videoById.get(h.videoId)).filter(Boolean) as YtVideoStats[];
      const followers = channel.subscriberCount;
      if (!followersMatchSize(followers, req.sizeMin, req.sizeMax)) {
        droppedSize += 1;
        continue;
      }
      const blob = `${channel.title} ${channel.description} ${hits.map((h) => h.title).join(" ")} ${stats.map((s) => s.title).join(" ")}`;
      if (restrictCountry) {
        const local = matchesSelectedCountries(channel.country ?? null, req.markets, {
          language: market.language,
          text: blob,
        });
        if (!local) {
          droppedCountry += 1;
          continue;
        }
      }
      if (shouldExcludePcHardware(niches) && looksLikePcHardware(blob)) {
        continue;
      }

      seen.add(channelId);
      const creator = buildCreator({
        channel,
        stats,
        hits,
        briefTerms: [...new Set([...terms, ...brand.goodFitWords.slice(0, 10)])],
        marketCode: worldwide ? "WW" : code,
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
    notes.push(
      `${code}: YouTube “${q}” → ${search.items.length} videos, ${grouped.size} channels, ${marketCreators.length} listed` +
        (droppedSize ? `, ${droppedSize} outside follower range` : "") +
        (droppedCountry ? `, ${droppedCountry} failed country check` : "") +
        ".",
    );
  }

  allCreators.sort((a, b) => b.fit - a.fit);
  notes.push("YouTube Data API v3 live search (relevance, region). Linked TikTok/Instagram handles come from public channel descriptions only.");
  notes.push("No messages are sent automatically. Marketer must edit and send.");
  if (!llmAvailable()) notes.push("OPENAI_API_KEY missing — query translation used the niche dictionary; fit is rules-only.");

  return {
    runId: `live-${Date.now()}`,
    brief: req.brief,
    createdAt: new Date().toISOString(),
    mode: "live",
    termsPerMarket: buildTermsPerMarket(niches, req.markets),
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
  const handles = extractHandles(
    `${channel.description} ${channel.keywords ?? ""} ${stats.map((s) => `${s.title} ${s.description}`).join(" ")}`,
  );
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
    brandName: opts.brand.name,
    prenew: opts.brand.name.trim().toLowerCase() === "prenew",
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
