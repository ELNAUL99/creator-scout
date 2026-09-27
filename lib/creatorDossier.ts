import type { RecentPost, ScoredCreator } from "./types";

export type CreatorDossier = {
  name: string;
  country: string | null;
  languages: string[];
  platforms: string[];
  followers: number;
  tier: string;
  avgViews: number;
  engagementRate: number;
  fit: number;
  reasons: string[];
  flags: string[];
  totalVideos: number | null;
  startedAt: string | null;
  channelAgeYears: number | null;
  channelAgeDays: number | null;
  recentUploadCount: number;
  lastPublishedAt: string | null;
  daysSinceLastUpload: number | null;
  lastGapDays: number | null;
  recentMeanGapDays: number | null;
  recentMedianGapDays: number | null;
  lifetimeDaysPerUpload: number | null;
  avgDurationSeconds: number | null;
  peakViews: number | null;
  peakTitle: string | null;
  peakUrl: string | null;
  medianDaysBetweenUploads: number | null;
  posts: {
    title: string;
    publishedAt: string | null;
    views: number | null;
    likes: number | null;
    comments: number | null;
    url: string;
    durationSeconds: number | null;
  }[];
  lifetimeViews: number | null;
  hiddenSubscribers: boolean;
  description: string | null;
  keywords: string[];
  topics: string[];
  searchMatchedTitles: string[];
  caveat: string;
};

function daysAgo(iso: string | null) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 86_400_000));
}

function median(nums: number[]) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function mean(nums: number[]) {
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function datedPosts(posts: RecentPost[]) {
  return posts
    .map((p) => ({ p, t: p.publishedAt ? Date.parse(p.publishedAt) : NaN }))
    .filter((x) => Number.isFinite(x.t))
    .sort((a, b) => b.t - a.t);
}

export function buildCreatorDossier(c: ScoredCreator): CreatorDossier {
  const yt = c.youtube;
  // Card titles are a preview. Cadence/length always use the stored YouTube pull.
  const timeline = yt?.latestUploads ?? [];
  const dated = datedPosts(timeline);
  const last = dated[0]?.p ?? timeline[0] ?? null;
  const lastPublishedAt = last?.publishedAt ?? null;

  let peak: RecentPost | null = null;
  for (const p of timeline) {
    if (p.views == null) continue;
    if (!peak || (peak.views ?? 0) < p.views) peak = p;
  }

  const gaps: number[] = [];
  for (let i = 0; i < dated.length - 1; i++) {
    gaps.push(Math.round((dated[i].t - dated[i + 1].t) / 86_400_000));
  }

  const startedAt = yt?.startedAt ?? c.startedAt ?? null;
  const startedMs = startedAt ? Date.parse(startedAt) : NaN;
  const channelAgeDays = Number.isFinite(startedMs)
    ? Math.max(1, Math.round((Date.now() - startedMs) / 86_400_000))
    : null;
  const videoCount = yt?.videoCount ?? c.totalVideos ?? null;
  const lifetimeDaysPerUpload =
    channelAgeDays && videoCount && videoCount > 0 ? Math.round(channelAgeDays / videoCount) : null;
  const durations = timeline.map((p) => p.durationSeconds).filter((n): n is number => typeof n === "number" && n > 0);
  const avgDurationSeconds = mean(durations);

  return {
    name: c.displayName,
    country: c.country,
    languages: c.languages,
    platforms: c.accounts.map((a) => a.platform),
    followers: yt?.hiddenSubscribers ? 0 : (yt?.subscriberCount ?? c.followers),
    tier: c.tier,
    avgViews: c.avgViews,
    engagementRate: c.engagementRate,
    fit: c.fit,
    reasons: c.reasons,
    flags: c.flags,
    totalVideos: videoCount,
    startedAt,
    channelAgeYears: channelAgeDays != null ? Math.round((channelAgeDays / 365.25) * 10) / 10 : null,
    channelAgeDays,
    recentUploadCount: timeline.length,
    lastPublishedAt,
    daysSinceLastUpload: daysAgo(lastPublishedAt),
    lastGapDays: gaps[0] ?? null,
    recentMeanGapDays: mean(gaps),
    recentMedianGapDays: median(gaps),
    lifetimeDaysPerUpload,
    avgDurationSeconds,
    peakViews: peak?.views ?? null,
    peakTitle: peak?.titleOrCaption ?? null,
    peakUrl: peak?.url ?? null,
    medianDaysBetweenUploads: median(gaps),
    posts: timeline.slice(0, 12).map((p) => ({
      title: p.titleOrCaption,
      publishedAt: p.publishedAt,
      views: p.views,
      likes: p.likes,
      comments: p.comments,
      url: p.url,
      durationSeconds: p.durationSeconds ?? null,
    })),
    lifetimeViews: yt?.lifetimeViews ?? null,
    hiddenSubscribers: Boolean(yt?.hiddenSubscribers),
    description: yt?.description?.slice(0, 1200) || null,
    keywords: yt?.keywords ?? [],
    topics: yt?.topics ?? [],
    searchMatchedTitles: (yt?.searchMatched ?? []).slice(0, 8).map((p) => p.titleOrCaption),
    caveat:
      "Numbers come from the YouTube channel pull stored at research time (channel statistics plus up to 50 newest uploads). The few titles on the card are only a preview.",
  };
}

function formatDuration(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(sec / 3600);
  const rm = Math.round((sec % 3600) / 60);
  return rm ? `${h}h ${rm}m` : `${h}h`;
}

function cadenceFacts(d: CreatorDossier) {
  const life =
    d.lifetimeDaysPerUpload != null && d.totalVideos
      ? `Lifetime average is one upload every ${d.lifetimeDaysPerUpload} day${d.lifetimeDaysPerUpload === 1 ? "" : "s"} (${d.totalVideos.toLocaleString()} videos over ${d.channelAgeYears ?? "?"} years).`
      : "Lifetime average is unknown because channel start date or video count is missing.";
  if (d.recentUploadCount < 2) {
    return `${life} Only ${d.recentUploadCount} recent upload${d.recentUploadCount === 1 ? " is" : "s are"} stored, so a gap between videos cannot be measured from that list.`;
  }
  const recent = ` Across the newest ${d.recentUploadCount} stored uploads, mean gap is ${d.recentMeanGapDays} days (median ${d.recentMedianGapDays ?? "n/a"}).`;
  const lastTwo =
    d.lastGapDays != null ? ` The two newest uploads are ${d.lastGapDays} day${d.lastGapDays === 1 ? "" : "s"} apart.` : "";
  return `${life}${recent}${lastTwo}`;
}

export function dossierToFacts(d: CreatorDossier) {
  const lines = [
    `Creator: ${d.name}`,
    `Country: ${d.country ?? "unknown"}`,
    `Languages: ${d.languages.join(", ") || "unknown"}`,
    `Platforms: ${d.platforms.join(", ") || "unknown"}`,
    `Followers: ${d.hiddenSubscribers ? "hidden by creator" : d.followers || "unknown"}`,
    `Tier: ${d.tier}`,
    `Lifetime channel views: ${d.lifetimeViews ?? "unknown"}`,
    `Average views on newest stored uploads: ${d.avgViews || "unknown"}`,
    `Engagement rate (newest stored uploads): ${(d.engagementRate * 100).toFixed(2)}%`,
    `Fit score: ${d.fit}`,
    `Why: ${d.reasons.join(" ") || "none"}`,
    `Flags: ${d.flags.join("; ") || "none"}`,
    `Total lifetime uploads: ${d.totalVideos ?? "unknown"}`,
    `Channel started: ${d.startedAt ?? "unknown"}${d.channelAgeYears != null ? ` (~${d.channelAgeYears} years, ${d.channelAgeDays} days)` : ""}`,
    `LIFETIME AVERAGE DAYS BETWEEN UPLOADS: ${d.lifetimeDaysPerUpload ?? "unknown"} (total videos divided by channel age — use this for average / how often)`,
    `NEWEST STORED UPLOADS COUNT: ${d.recentUploadCount}`,
    `MEAN GAP BETWEEN NEWEST STORED UPLOADS: ${d.recentMeanGapDays ?? "unknown"} days`,
    `MEDIAN GAP BETWEEN NEWEST STORED UPLOADS: ${d.recentMedianGapDays ?? "unknown"} days`,
    `GAP BETWEEN THE TWO NEWEST UPLOADS: ${d.lastGapDays ?? "unknown"} days`,
    `AVERAGE VIDEO DURATION (newest stored uploads): ${d.avgDurationSeconds != null ? formatDuration(d.avgDurationSeconds) : "unknown"}`,
    `Last upload date: ${d.lastPublishedAt ?? "unknown"}`,
    `Days since last upload: ${d.daysSinceLastUpload ?? "unknown"}`,
    `Highest views among newest stored uploads: ${d.peakViews ?? "unknown"}`,
    `That title: ${d.peakTitle ?? "unknown"}`,
    `Topics: ${d.topics.join(", ") || "none"}`,
    `Keywords: ${d.keywords.slice(0, 20).join(", ") || "none"}`,
    `Description: ${d.description || "none"}`,
    d.caveat,
    "Newest stored uploads (use these titles for posted lately):",
    ...d.posts.map((p, i) => {
      const bits = [
        `${i + 1}. ${p.title}`,
        p.publishedAt ? p.publishedAt : null,
        p.views != null ? `${p.views} views` : null,
        p.likes != null ? `${p.likes} likes` : null,
      ].filter(Boolean);
      return bits.join(" · ");
    }),
  ];
  if (d.searchMatchedTitles.length) {
    lines.push(
      "Discovery matches (how we found the channel — ignore for last upload and average cadence): " +
        d.searchMatchedTitles.join(" | "),
    );
  }
  return lines.join("\n");
}

export function snapshotLine(d: CreatorDossier) {
  const recency =
    d.daysSinceLastUpload == null
      ? "last upload unknown"
      : d.daysSinceLastUpload === 0
        ? "uploaded today"
        : d.daysSinceLastUpload === 1
          ? "uploaded yesterday"
          : `last upload ${d.daysSinceLastUpload} days ago`;
  const peak =
    d.peakViews == null
      ? "peak views among recent uploads unknown"
      : `peak ${d.peakViews.toLocaleString()} views among recent uploads`;
  const cadence =
    d.lifetimeDaysPerUpload != null
      ? `lifetime avg every ${d.lifetimeDaysPerUpload} days`
      : d.recentMeanGapDays != null
        ? `recent avg every ${d.recentMeanGapDays} days`
        : "cadence unknown";
  return `${recency} · ${peak} · ${cadence}`;
}

function q(s: string) {
  return s.toLowerCase();
}

export function isChannelStatsQuestion(question: string) {
  const t = q(question);
  return /average|mean|cadence|how often|frequen|after another|gap|last upload|how recent|upload|posting|active|inactive|fresh|peak view|posted lately|what have they posted|how long|duration|length|minute|runtime|recent/.test(
    t,
  );
}

export function isJudgmentQuestion(question: string) {
  const t = q(question);
  return /well known|famous|household|should we|worth|recommend|outreach|deal|risk|brand fit|collab\?/.test(t);
}

export function answerFromFacts(question: string, d: CreatorDossier): string {
  const t = q(question);

  if (/how long|duration|length|minute|runtime/.test(t)) {
    if (d.avgDurationSeconds == null) {
      return `Video length is not stored for ${d.name} yet. Run discovery again so Scout can pull duration from YouTube on the newest uploads.`;
    }
    return `Average length of the newest stored uploads is ${formatDuration(d.avgDurationSeconds)} (${d.recentUploadCount} video${d.recentUploadCount === 1 ? "" : "s"}). That is not every video on the channel.`;
  }

  if (/average|mean|cadence|how often|frequen|after another|gap|how recent|recent/.test(t) || (/upload/.test(t) && /time|often|average|recent/.test(t))) {
    const last =
      d.daysSinceLastUpload == null
        ? ""
        : ` Last upload was ${d.daysSinceLastUpload} day${d.daysSinceLastUpload === 1 ? "" : "s"} ago (${d.lastPublishedAt?.slice(0, 10) ?? "unknown"}).`;
    return `${cadenceFacts(d)}${last}`;
  }

  if (/famous|popular|well.?known|household|society|celebrity|how big|reach|audience size/.test(t)) {
    const fol = d.followers > 0 ? `${d.followers.toLocaleString()} followers (${d.tier})` : `no public follower count (${d.tier})`;
    const peak =
      d.peakViews == null
        ? "no peak view among stored recent uploads"
        : `${d.peakViews.toLocaleString()} views on the biggest of the newest stored uploads`;
    return `${d.name} is a ${d.tier} creator with ${fol}, country ${d.country ?? "unknown"}. ${peak}. That is a collab-size signal, not proof they are a household name.`;
  }

  if (/peak|highest|best.?perform|most view|viral|biggest/.test(t)) {
    if (d.peakViews == null || !d.peakTitle) {
      return `No view counts on the stored recent uploads for ${d.name}.`;
    }
    return `Among the newest stored uploads, the peak is ${d.peakViews.toLocaleString()} views on “${d.peakTitle}”. That is not necessarily their all-time high.`;
  }

  if (/recent|last upload|upload|posted|posting|active|inactive|fresh/.test(t) && !/what.*(post|video|content)/.test(t)) {
    const recency =
      d.daysSinceLastUpload == null
        ? "The last publish date is missing."
        : `Last upload was ${d.daysSinceLastUpload} day${d.daysSinceLastUpload === 1 ? "" : "s"} ago (${d.lastPublishedAt?.slice(0, 10)}).`;
    return `${recency} ${cadenceFacts(d)}`;
  }

  if (/title|content|video|post|about|topic|what.*(they|she|he)|latest/.test(t)) {
    if (!d.posts.length) {
      return `No recent titles stored for ${d.name}.`;
    }
    const list = d.posts
      .slice(0, 5)
      .map((p) => `“${p.title}”${p.views != null ? ` (${p.views.toLocaleString()} views)` : ""}`)
      .join("; ");
    return `Newest stored titles: ${list}.`;
  }

  if (/engag|like|comment|er\b/.test(t)) {
    return `Engagement rate on newest stored uploads is ${(d.engagementRate * 100).toFixed(2)}% with average views ${d.avgViews.toLocaleString()}.`;
  }

  if (/fit|why|score|brand|collab|good/.test(t)) {
    return `${d.name} scored ${d.fit} fit. ${d.reasons.join(" ") || "No extra reasons stored."}${d.flags.length ? ` Watch-outs: ${d.flags.join("; ")}.` : ""}`;
  }

  if (/follower|size|tier|how big/.test(t)) {
    return `${d.name} is ${d.tier}${d.followers > 0 ? ` with ${d.followers.toLocaleString()} followers` : " (no public follower count)"}.`;
  }

  return `${d.name}: ${snapshotLine(d)}. ${d.posts[0] ? `Latest title: “${d.posts[0].title}”.` : ""}`;
}
