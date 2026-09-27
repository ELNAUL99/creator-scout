import type { YoutubeResearch } from "./types";
import {
  fetchChannels,
  fetchRecentUploads,
  fetchVideos,
  parseChannelKeywords,
  statsToPost,
  type YtChannel,
  type YtVideoStats,
} from "./youtube";
import { getYoutubeResearch, saveYoutubeResearch } from "./youtubeStore";

function youtubeKey() {
  return (process.env.YOUTUBE_API_KEY ?? "").trim();
}

function byNewest<T extends { publishedAt?: string | null }>(posts: T[]) {
  return [...posts].sort((a, b) => Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? "") || 0);
}

export function buildYoutubeResearch(opts: {
  channel: YtChannel;
  latest: YtVideoStats[];
  searchMatched?: YtVideoStats[];
  lang?: string;
}): YoutubeResearch {
  const lang = opts.lang ?? opts.channel.defaultLanguage ?? "en";
  return {
    pulledAt: new Date().toISOString(),
    channelId: opts.channel.id,
    description: opts.channel.description,
    customUrl: opts.channel.customUrl ?? null,
    defaultLanguage: opts.channel.defaultLanguage ?? null,
    keywords: parseChannelKeywords(opts.channel.keywords),
    topics: opts.channel.topics ?? [],
    lifetimeViews: opts.channel.viewCount,
    videoCount: opts.channel.videoCount,
    hiddenSubscribers: Boolean(opts.channel.hiddenSubscribers),
    channelMadeForKids: opts.channel.channelMadeForKids ?? null,
    startedAt: opts.channel.startedAt ?? null,
    subscriberCount: opts.channel.subscriberCount,
    latestUploads: byNewest(opts.latest.map((s) => statsToPost(s, lang))),
    searchMatched: byNewest((opts.searchMatched ?? []).map((s) => statsToPost(s, lang))),
  };
}

function researchLooksComplete(row: YoutubeResearch) {
  return row.latestUploads.length >= 8 || row.videoCount <= row.latestUploads.length;
}

/** Store first; if the card only had discovery hits, pull the channel from YouTube now. */
export async function ensureYoutubeResearch(
  channelId: string,
  fallback?: YoutubeResearch | null,
): Promise<YoutubeResearch | null> {
  const stored = (await getYoutubeResearch(channelId)) ?? fallback ?? null;
  if (stored && researchLooksComplete(stored) && stored.latestUploads.some((p) => p.durationSeconds)) {
    return stored;
  }
  const live = await pullYoutubeChannel(channelId, stored?.searchMatched);
  return live ?? stored;
}

export async function pullYoutubeChannel(
  channelId: string,
  searchMatched?: YoutubeResearch["searchMatched"],
): Promise<YoutubeResearch | null> {
  const key = youtubeKey();
  if (!key || !channelId) return null;
  const ch = await fetchChannels(key, [channelId]);
  const channel = ch.items[0];
  if (!channel) return null;
  const uploads = await fetchRecentUploads(
    key,
    [{ channelId, playlistId: channel.uploadsPlaylistId }],
    50,
  );
  const ids = (uploads.byChannel.get(channelId) ?? []).map((u) => u.videoId);
  const vids = ids.length ? await fetchVideos(key, ids) : { items: [] as YtVideoStats[], units: 0 };
  const research = buildYoutubeResearch({ channel, latest: vids.items });
  if (searchMatched?.length && !research.searchMatched.length) {
    research.searchMatched = searchMatched;
  }
  await saveYoutubeResearch([research]);
  return research;
}
