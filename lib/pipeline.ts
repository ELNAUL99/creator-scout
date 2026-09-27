import { mergeBrand } from "./brand";
import { extractHandles } from "./handles";
import { llmAvailable, llmFit, llmTranslate } from "./llm";
import { matchesSelectedCountries } from "./localeMatch";
import { countrySearchLabels, getMarket } from "./markets";
import { draftMessage, hoursSaved, ruleReasons } from "./messages";
import {
  dictionaryTerms,
  isNicheId,
  looksLikePcHardware,
  nichesFromBrief,
  buildTermsPerMarket,
  NICHE_TERMS,
  shouldExcludePcHardware,
  youtubeSearchPlan,
} from "./niches";
import { sampleDiscover } from "./sample";
import { scoreCreator, TIER_BENCHMARK } from "./scoring";
import { connectedOptInCreators } from "./optInCreators";
import { getIgConnection } from "./igConnectionStore";
import { businessDiscovery, envIgAuth } from "./instagram";
import { prenewCollabCreators } from "./prenewCollabs";
import { presetCatalogCreators } from "./presetCatalog";
import { scoreVisibleProfile } from "./scoreProfile";
import { filterCreatorsBySize, followersMatchSize, sizeRangeActive } from "./sizeRange";
import { discoverViaSearchIndex } from "./webDiscover";
import { twitchDiscoverCreators } from "./twitchCreators";
import { twitchConfigured } from "./twitch";
import { saveYoutubeResearch } from "./youtubeStore";
import { buildYoutubeResearch } from "./youtubeResearch";
import type { CreatorAccount, DiscoverRequest, DiscoverResponse, MarketTerms, RecentPost, ScoredCreator } from "./types";
import {
  fetchChannels,
  fetchRecentUploads,
  fetchVideos,
  searchChannels,
  searchRecentVideos,
  statsToPost,
  youtubeUrl,
  type YtChannel,
  type YtVideoHit,
  type YtVideoStats,
} from "./youtube";

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
      "TikTok Login Kit only returns the account you signed in with. There is no official TikTok search for other creators — Connect that account, or use site: search if a search API key is set.",
    );
  }
  return { extra, notes };
}

async function attachLiveSources(req: DiscoverRequest, result: DiscoverResponse): Promise<DiscoverResponse> {
  let creators = [...result.creators];
  let notes = [...result.notes];
  const platforms = req.platforms?.length ? req.platforms : ["youtube", "tiktok", "instagram"];
  const socials = await expandSocialsFromYoutube(req, creators);
  creators = mergeCreators(creators, socials.extra);
  notes = [...notes, ...socials.notes];

  if (req.webDiscover !== false && (platforms.includes("tiktok") || platforms.includes("instagram"))) {
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

  if (req.includePresetCatalog) {
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
    "YouTube is live API search. TikTok and Instagram only appear via Connect (the account that signed in), site: search if configured, or the labelled demo catalog. Connect is not a crawl.",
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
            "Not substituting the collab sheet or sample channels. Connected TikTok/Instagram and site: search still run.",
          ]),
        );
        blocked.error = message;
        return blocked;
      }
      if (/quota|rateLimitExceeded|429/i.test(message)) {
        // Quota is a soft, temporary condition — degrade instead of 500ing so
        // Twitch / opt-in / preset sources still return.
        const quota = await attachLiveSources(
          req,
          emptyLive(req, [
            "YouTube daily search quota is used up (10,000 units/day; each search costs 100). Live YouTube discovery pauses until the quota resets (~midnight US Pacific).",
            "Twitch, connected accounts, and demo catalog still run. Request a higher YouTube quota in Google Cloud, or use a second API key, to raise the daily limit.",
          ]),
        );
        return quota;
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
    "Search uses your niche plus a short brief. Scoring uses the YouTube channel we pulled, not a separate brand page.",
  );

  if (req.markets.length) {
    notes.push(
      req.localOnly !== false
        ? "Keeping channels in the selected country, plus channels that clearly use that language (including localised content aimed at that audience). English-only foreign channels are dropped."
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
      ? { code: "WW", language: "en", ytRegion: "", name: "Worldwide", languageName: "English" }
      : getMarket(code);
    const terms = dictionaryTerms(niches, market.language);
    const userQ = (req.brand?.pitch ?? req.brief ?? "").trim();
    if (llmAvailable() && userQ && market.language !== "en") {
      const translated = await llmTranslate(userQ, market.name, market.languageName);
      if (translated?.terms.length) terms.push(...translated.terms);
    }

    const grouped = new Map<string, YtVideoHit[]>();
    const addVideoHits = (items: YtVideoHit[]) => {
      for (const v of items) {
        const list = grouped.get(v.channelId) ?? [];
        // Dedupe by video id — the same video can come back from multiple keyword
        // queries, and we must not count it 2–3× (it skews avg/peak views).
        // 3 distinct videos/channel is enough to estimate avg views/engagement and
        // keeps the videos.list fan-out small when discovering ~500 channels.
        if (list.length < 3 && !list.some((x) => x.videoId === v.videoId)) list.push(v);
        grouped.set(v.channelId, list);
      }
    };

    const plan = worldwide
      ? youtubeSearchPlan(niches, "en", undefined, userQ)
      : youtubeSearchPlan(niches, market.language, countrySearchLabels(market), userQ);
    const regionCode = worldwide ? undefined : market.ytRegion;

    // Discovery breadth vs YouTube quota (search.list = 100 units, 10k/day free).
    // Prioritize BREADTH: one page per distinct keyword variant, so specific/local
    // queries (e.g. "minecraft Suomi") actually run instead of one generic query
    // (e.g. "minecraft") hogging the whole budget with deep pagination. Then, if
    // budget remains and we're short of the target, take a 2nd page of the first
    // few queries for depth.
    const CHANNEL_TARGET = 500;
    const MAX_VIDEO_CALLS = 12;
    const MAX_CHANNEL_CALLS = 6;
    const days = Math.max(1, req.timeWindowDays || 90);
    const publishedAfter = new Date(Date.now() - days * 86_400_000).toISOString();
    let videoCalls = 0;
    let channelCalls = 0;

    // Pass 1 (breadth): first page of each video query.
    const videoTokens: (string | undefined)[] = [];
    for (const step of plan) {
      if (videoCalls >= MAX_VIDEO_CALLS || grouped.size >= CHANNEL_TARGET) break;
      const batch = await searchRecentVideos({
        key,
        q: step.q,
        regionCode,
        relevanceLanguage: step.relevanceLanguage,
        publishedAfter,
        order: "relevance",
        maxResults: 50,
      });
      units += batch.units;
      videoCalls += 1;
      addVideoHits(batch.items);
      videoTokens.push(batch.nextPageToken);
    }
    // Pass 2 (depth): second page of the earliest queries if budget/target allow.
    for (let i = 0; i < videoTokens.length; i++) {
      if (videoCalls >= MAX_VIDEO_CALLS || grouped.size >= CHANNEL_TARGET) break;
      const token = videoTokens[i];
      if (!token) continue;
      const batch = await searchRecentVideos({
        key,
        q: plan[i].q,
        regionCode,
        relevanceLanguage: plan[i].relevanceLanguage,
        publishedAfter,
        order: "relevance",
        maxResults: 50,
        pageToken: token,
      });
      units += batch.units;
      videoCalls += 1;
      addVideoHits(batch.items);
    }

    // Channel search: one page per query for breadth.
    for (const step of plan) {
      if (channelCalls >= MAX_CHANNEL_CALLS || grouped.size >= CHANNEL_TARGET) break;
      const chSearch = await searchChannels({
        key,
        q: step.q,
        regionCode,
        relevanceLanguage: step.relevanceLanguage,
        maxResults: 50,
      });
      units += chSearch.units;
      channelCalls += 1;
      for (const channelId of chSearch.channelIds) {
        if (!grouped.has(channelId)) grouped.set(channelId, []);
      }
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
    let droppedHardware = 0;
    const dropHardware = shouldExcludePcHardware(niches);
    type Keep = { channelId: string; channel: YtChannel; hits: YtVideoHit[]; searchStats: YtVideoStats[] };
    const keep: Keep[] = [];
    for (const [channelId, hits] of grouped) {
      if (seen.has(channelId)) continue;
      const channel = channelById.get(channelId);
      if (!channel) continue;
      const searchStats = hits.map((h) => videoById.get(h.videoId)).filter(Boolean) as YtVideoStats[];
      const followers = channel.subscriberCount;
      if (!followersMatchSize(followers, req.sizeMin, req.sizeMax)) {
        droppedSize += 1;
        continue;
      }
      const blob = `${channel.title} ${channel.description} ${hits.map((h) => h.title).join(" ")} ${searchStats.map((s) => s.title).join(" ")}`;
      if (dropHardware && looksLikePcHardware(blob)) {
        droppedHardware += 1;
        continue;
      }
      if (restrictCountry) {
        const local = matchesSelectedCountries(channel.country ?? null, req.markets, {
          language: market.language,
          text: blob,
          videoLanguages: searchStats.map((s) => s.defaultLanguage).filter(Boolean) as string[],
        });
        if (!local) {
          droppedCountry += 1;
          continue;
        }
      }
      seen.add(channelId);
      keep.push({ channelId, channel, hits, searchStats });
    }

    // Search hits are relevance matches, not "latest on the channel".
    // playlistItems.list is 1 unit and returns newest uploads for recency.
    const uploadRes = await fetchRecentUploads(
      key,
      keep.map((k) => ({ channelId: k.channelId, playlistId: k.channel.uploadsPlaylistId })),
      50,
    );
    units += uploadRes.units;
    const extraVideoIds: string[] = [];
    for (const items of uploadRes.byChannel.values()) {
      for (const it of items) {
        if (!videoById.has(it.videoId)) extraVideoIds.push(it.videoId);
      }
    }
    if (extraVideoIds.length) {
      const extra = await fetchVideos(key, extraVideoIds);
      units += extra.units;
      for (const v of extra.items) videoById.set(v.id, v);
    }

    for (const row of keep) {
      const uploads = uploadRes.byChannel.get(row.channelId) ?? [];
      const uploadStats = uploads.map((u) => videoById.get(u.videoId)).filter(Boolean) as YtVideoStats[];
      marketCreators.push(
        buildCreator({
          channel: row.channel,
          stats: uploadStats.length ? uploadStats : row.searchStats,
          searchStats: row.searchStats,
          hits: uploads.length
            ? uploads.map((u) => ({
                videoId: u.videoId,
                channelId: row.channelId,
                channelTitle: row.channel.title,
                title: u.title,
                description: "",
                publishedAt: u.publishedAt,
              }))
            : row.hits,
          briefTerms: [...new Set([...terms, ...dictionaryTerms(niches, "en"), ...brand.goodFitWords.slice(0, 10)])],
          marketCode: worldwide ? "WW" : code,
          marketLang: market.language,
          brand,
          nicheLabels: niches.map((id) => NICHE_TERMS[id].label),
          dataDate: new Date().toISOString().slice(0, 10),
        }),
      );
    }

    marketCreators.sort((a, b) => b.fit - a.fit);
    // LLM fit is the slow part (one call per creator). Score only the top few,
    // and run them in parallel so a deep run doesn't take 30–60s.
    const top = marketCreators.slice(0, 10);
    if (llmAvailable()) {
      await Promise.all(
        top.map(async (c) => {
          const fit = await llmFit({
            brandName: brand.name || "an advertiser",
            pitch: brand.pitch || req.brief,
            goodWords: brand.goodFitWords.length ? brand.goodFitWords : terms.slice(0, 12),
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
            if (fit.risks.length) {
              const riskText = fit.risks.filter((r): r is string => typeof r === "string" && r.trim().length > 0);
              c.flags = [...new Set([...c.flags, ...riskText])];
            }
            c.hiddenGem = c.fit >= 70 && c.followers < 50_000 && c.flags.length === 0;
          }
        }),
      );
    }
    allCreators.push(...marketCreators);
    notes.push(
      `${code}: YouTube ${plan
          .slice(0, Math.min(plan.length, MAX_VIDEO_CALLS))
          .map((s) => `“${s.q}”`)
          .join(" + ")}${plan.length > MAX_VIDEO_CALLS ? ` (+${plan.length - MAX_VIDEO_CALLS} more keywords not queried this run)` : ""} → ${grouped.size} channels, ${marketCreators.length} in the selected subscriber range` +
        (droppedSize
          ? `, ${droppedSize} other YouTube hits were outside ${req.sizeMin.toLocaleString()}–${sizeRangeActive(req.sizeMin, req.sizeMax) ? `${req.sizeMax.toLocaleString()}` : "any"} (mega/nano — not the missing mid-tier names)`
          : "") +
        (droppedCountry ? `, ${droppedCountry} failed country/language check` : "") +
        (droppedHardware ? `, ${droppedHardware} looked like PC-hardware (not the selected play niche)` : "") +
        ".",
    );
  }

  allCreators.sort((a, b) => b.fit - a.fit);
  const stored = allCreators.flatMap((c) => (c.youtube ? [c.youtube] : []));
  if (stored.length) await saveYoutubeResearch(stored);
  notes.push("YouTube Data API has no subscriber filter. Scout asks for videos/channels matching your brief, then keeps those whose listed subscriber count is in range. A 90k creator is not dropped for size unless YouTube returned them with a count outside that range — if they never appear, they were not in YouTube’s search hits.");
  notes.push(`Stored the full channel record plus up to 50 newest uploads for ${stored.length} YouTube creator(s). Follow-ups use that store, not the keyword-search sample.`);
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

function videoToPost(s: YtVideoStats, lang: string): RecentPost {
  return statsToPost(s, lang);
}

function byNewest(posts: RecentPost[]) {
  return [...posts].sort((a, b) => Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? "") || 0);
}

function buildCreator(opts: {
  channel: YtChannel;
  stats: YtVideoStats[];
  searchStats: YtVideoStats[];
  hits: YtVideoHit[];
  briefTerms: string[];
  marketCode: string;
  marketLang: string;
  brand: ReturnType<typeof mergeBrand>;
  nicheLabels: string[];
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
  const madeForKids = Boolean(channel.channelMadeForKids) || stats.some((s) => s.madeForKids);
  const text = `${channel.title} ${channel.description} ${channel.keywords ?? ""} ${stats.map((s) => s.title).join(" ")}`;
  const contentLangMatch =
    stats.some((s) => (s.defaultLanguage ?? "").toLowerCase().startsWith(opts.marketLang)) ||
    (channel.country ?? "").toUpperCase() === opts.marketCode ||
    (channel.defaultLanguage ?? "").toLowerCase().startsWith(opts.marketLang);
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
  const latestUploads = byNewest(stats.map((s) => videoToPost(s, opts.marketLang)));
  const searchMatched = byNewest(
    (opts.searchStats.length ? opts.searchStats : []).map((s) => videoToPost(s, opts.marketLang)),
  );
  const posts: RecentPost[] = latestUploads.length
    ? latestUploads
    : (hits.map((h) => ({
        postId: h.videoId,
        url: `https://www.youtube.com/watch?v=${h.videoId}`,
        titleOrCaption: h.title,
        publishedAt: h.publishedAt || null,
        views: null,
        likes: null,
        comments: null,
        language: opts.marketLang,
        madeForKids: false,
      })) as RecentPost[]);
  const langs = [
    ...new Set(
      [channel.defaultLanguage, opts.marketLang, ...posts.map((p) => p.language)]
        .filter(Boolean)
        .map((l) => (l as string).split("-")[0]),
    ),
  ];
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
    languages: langs,
    niches: opts.nicheLabels,
    audienceAge: madeForKids ? "kids" : "adult",
    contactRoute: "YouTube About page (business email) — tool links there, does not scrape private contact",
    accounts,
    recentContent: posts,
    followers: channel.subscriberCount,
    tier: scored.tier,
    avgViews: views,
    totalVideos: channel.videoCount || null,
    startedAt: channel.startedAt ?? null,
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
    youtube: buildYoutubeResearch({
      channel,
      latest: stats,
      searchMatched: opts.searchStats,
      lang: opts.marketLang,
    }),
  };
}

function avg(n: number[]) {
  if (!n.length) return 0;
  return Math.round(n.reduce((a, b) => a + b, 0) / n.length);
}
