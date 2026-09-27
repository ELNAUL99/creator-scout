import { extractHandles } from "./handles";

const YT = "https://www.googleapis.com/youtube/v3";

export type YtVideoHit = {
  videoId: string;
  channelId: string;
  channelTitle: string;
  title: string;
  description: string;
  publishedAt: string;
};

export type YtChannel = {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  country?: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  startedAt?: string; // channel creation date (snippet.publishedAt)
  keywords?: string;
};

export type YtVideoStats = {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  channelId: string;
  views: number;
  likes: number;
  comments: number;
  madeForKids: boolean;
  defaultLanguage?: string;
};

async function ytGet<T>(path: string, params: Record<string, string>, key: string): Promise<T> {
  const url = new URL(`${YT}/${path}`);
  url.searchParams.set("key", key);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatYtError(path, res.status, body));
  }
  return res.json() as Promise<T>;
}

function formatYtError(path: string, status: number, body: string) {
  let reason = "";
  let message = "";
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string; status?: string; errors?: { reason?: string }[] };
    };
    message = parsed.error?.message ?? "";
    reason = parsed.error?.errors?.[0]?.reason ?? parsed.error?.status ?? "";
  } catch {
    message = body.slice(0, 240);
  }

  if (status === 403 && /V3DataSearchService\.List are blocked|search.*blocked/i.test(message)) {
    return [
      "YouTube blocked search.list on this API key.",
      "In Google Cloud: enable YouTube Data API v3 for this project,",
      "then edit the key → API restrictions → allow YouTube Data API v3 (or Don't restrict key).",
      "For a local Node server, Application restrictions should be None (or IP), not HTTP referrers.",
    ].join(" ");
  }
  if (status === 403 && /referer|ip.*blocked|android|ios/i.test(message + reason)) {
    return "This API key is locked to browsers or apps. Create a new key with Application restrictions set to None for local development.";
  }
  return `YouTube API ${path} ${status}${reason ? ` (${reason})` : ""}: ${message || body.slice(0, 240)}`;
}

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function searchRecentVideos(opts: {
  key: string;
  q: string;
  regionCode?: string;
  relevanceLanguage?: string;
  publishedAfter?: string;
  order?: "date" | "relevance" | "viewCount" | "rating";
  maxResults?: number;
  pageToken?: string;
}): Promise<{ items: YtVideoHit[]; nextPageToken?: string; units: number }> {
  type SearchRes = {
    nextPageToken?: string;
    items?: {
      id?: { videoId?: string };
      snippet?: {
        channelId?: string;
        channelTitle?: string;
        title?: string;
        description?: string;
        publishedAt?: string;
      };
    }[];
  };
  const params: Record<string, string> = {
    part: "snippet",
    type: "video",
    q: opts.q,
    order: opts.order ?? "relevance",
    maxResults: String(opts.maxResults ?? 25),
  };
  if (opts.regionCode) params.regionCode = opts.regionCode;
  if (opts.relevanceLanguage) params.relevanceLanguage = opts.relevanceLanguage;
  if (opts.publishedAfter) params.publishedAfter = opts.publishedAfter;
  if (opts.pageToken) params.pageToken = opts.pageToken;
  const data = await ytGet<SearchRes>("search", params, opts.key);
  const items: YtVideoHit[] = [];
  for (const it of data.items ?? []) {
    const videoId = it.id?.videoId;
    const channelId = it.snippet?.channelId;
    if (!videoId || !channelId) continue;
    items.push({
      videoId,
      channelId,
      channelTitle: it.snippet?.channelTitle ?? "",
      title: it.snippet?.title ?? "",
      description: it.snippet?.description ?? "",
      publishedAt: it.snippet?.publishedAt ?? "",
    });
  }
  return { items, nextPageToken: data.nextPageToken, units: 100 };
}

export async function searchChannels(opts: {
  key: string;
  q: string;
  regionCode?: string;
  relevanceLanguage?: string;
  maxResults?: number;
  pageToken?: string;
}): Promise<{ channelIds: string[]; nextPageToken?: string; units: number }> {
  type SearchRes = {
    nextPageToken?: string;
    items?: {
      id?: { channelId?: string };
    }[];
  };
  const params: Record<string, string> = {
    part: "snippet",
    type: "channel",
    q: opts.q,
    order: "relevance",
    maxResults: String(opts.maxResults ?? 25),
  };
  if (opts.regionCode) params.regionCode = opts.regionCode;
  if (opts.relevanceLanguage) params.relevanceLanguage = opts.relevanceLanguage;
  if (opts.pageToken) params.pageToken = opts.pageToken;
  const data = await ytGet<SearchRes>("search", params, opts.key);
  const channelIds: string[] = [];
  const seen = new Set<string>();
  for (const it of data.items ?? []) {
    const id = it.id?.channelId;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    channelIds.push(id);
  }
  return { channelIds, nextPageToken: data.nextPageToken, units: 100 };
}

export async function fetchChannels(key: string, ids: string[]): Promise<{ items: YtChannel[]; units: number }> {
  if (ids.length === 0) return { items: [], units: 0 };
  let units = 0;
  const items: YtChannel[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    type ChRes = {
      items?: {
        id?: string;
        snippet?: { title?: string; description?: string; customUrl?: string; country?: string; publishedAt?: string };
        statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string; hiddenSubscriberCount?: boolean };
        brandingSettings?: { channel?: { keywords?: string } };
      }[];
    };
    const data = await ytGet<ChRes>(
      "channels",
      { part: "snippet,statistics,brandingSettings", id: batch.join(",") },
      key,
    );
    units += 1;
    for (const ch of data.items ?? []) {
      if (!ch.id) continue;
      items.push({
        id: ch.id,
        title: ch.snippet?.title ?? "",
        description: ch.snippet?.description ?? "",
        customUrl: ch.snippet?.customUrl,
        country: ch.snippet?.country,
        subscriberCount: ch.statistics?.hiddenSubscriberCount ? 0 : num(ch.statistics?.subscriberCount),
        viewCount: num(ch.statistics?.viewCount),
        videoCount: num(ch.statistics?.videoCount),
        startedAt: ch.snippet?.publishedAt,
        keywords: ch.brandingSettings?.channel?.keywords,
      });
    }
  }
  return { items, units };
}

export async function fetchVideos(key: string, ids: string[]): Promise<{ items: YtVideoStats[]; units: number }> {
  if (ids.length === 0) return { items: [], units: 0 };
  let units = 0;
  const items: YtVideoStats[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    type VRes = {
      items?: {
        id?: string;
        snippet?: { title?: string; description?: string; publishedAt?: string; channelId?: string; defaultLanguage?: string; defaultAudioLanguage?: string };
        statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
        status?: { madeForKids?: boolean; selfDeclaredMadeForKids?: boolean };
      }[];
    };
    const data = await ytGet<VRes>(
      "videos",
      { part: "snippet,statistics,status", id: batch.join(",") },
      key,
    );
    units += 1;
    for (const v of data.items ?? []) {
      if (!v.id) continue;
      items.push({
        id: v.id,
        title: v.snippet?.title ?? "",
        description: v.snippet?.description ?? "",
        publishedAt: v.snippet?.publishedAt ?? "",
        channelId: v.snippet?.channelId ?? "",
        views: num(v.statistics?.viewCount),
        likes: num(v.statistics?.likeCount),
        comments: num(v.statistics?.commentCount),
        madeForKids: Boolean(v.status?.madeForKids || v.status?.selfDeclaredMadeForKids),
        defaultLanguage: v.snippet?.defaultAudioLanguage ?? v.snippet?.defaultLanguage,
      });
    }
  }
  return { items, units };
}

export async function fetchMostPopular(opts: {
  key: string;
  regionCode: string;
  maxResults?: number;
  videoCategoryId?: string;
}): Promise<{ items: (YtVideoStats & { tags: string[]; channelTitle: string })[]; units: number }> {
  type VRes = {
    items?: {
      id?: string;
      snippet?: {
        title?: string;
        description?: string;
        publishedAt?: string;
        channelId?: string;
        channelTitle?: string;
        tags?: string[];
        defaultLanguage?: string;
        defaultAudioLanguage?: string;
      };
      statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
      status?: { madeForKids?: boolean; selfDeclaredMadeForKids?: boolean };
    }[];
  };
  const params: Record<string, string> = {
    part: "snippet,statistics,status",
    chart: "mostPopular",
    regionCode: opts.regionCode,
    maxResults: String(opts.maxResults ?? 25),
  };
  if (opts.videoCategoryId) params.videoCategoryId = opts.videoCategoryId;
  const data = await ytGet<VRes>("videos", params, opts.key);
  const items: (YtVideoStats & { tags: string[]; channelTitle: string })[] = [];
  for (const v of data.items ?? []) {
    if (!v.id || !v.snippet?.channelId) continue;
    items.push({
      id: v.id,
      title: v.snippet.title ?? "",
      description: v.snippet.description ?? "",
      publishedAt: v.snippet.publishedAt ?? "",
      channelId: v.snippet.channelId,
      views: num(v.statistics?.viewCount),
      likes: num(v.statistics?.likeCount),
      comments: num(v.statistics?.commentCount),
      madeForKids: Boolean(v.status?.madeForKids || v.status?.selfDeclaredMadeForKids),
      defaultLanguage: v.snippet.defaultAudioLanguage ?? v.snippet.defaultLanguage,
      tags: v.snippet.tags ?? [],
      channelTitle: v.snippet.channelTitle ?? "",
    });
  }
  return { items, units: 1 };
}

export function channelSocials(description: string) {
  return extractHandles(description);
}

export function youtubeUrl(channel: YtChannel) {
  if (channel.customUrl) {
    const h = channel.customUrl.startsWith("@") ? channel.customUrl : `@${channel.customUrl.replace(/^\//, "")}`;
    return `https://www.youtube.com/${h}`;
  }
  return `https://www.youtube.com/channel/${channel.id}`;
}
