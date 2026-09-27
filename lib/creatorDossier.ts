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
  postCountInSample: number;
  lastPublishedAt: string | null;
  daysSinceLastUpload: number | null;
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
  }[];
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

function datedPosts(posts: RecentPost[]) {
  return posts
    .map((p) => ({ p, t: p.publishedAt ? Date.parse(p.publishedAt) : NaN }))
    .filter((x) => Number.isFinite(x.t))
    .sort((a, b) => b.t - a.t);
}

export function buildCreatorDossier(c: ScoredCreator): CreatorDossier {
  const dated = datedPosts(c.recentContent);
  const last = dated[0]?.p ?? c.recentContent[0] ?? null;
  const lastPublishedAt = last?.publishedAt ?? null;

  let peak: RecentPost | null = null;
  for (const p of c.recentContent) {
    if (p.views == null) continue;
    if (!peak || (peak.views ?? 0) < p.views) peak = p;
  }

  const gaps: number[] = [];
  for (let i = 0; i < dated.length - 1; i++) {
    gaps.push(Math.round((dated[i].t - dated[i + 1].t) / 86_400_000));
  }

  return {
    name: c.displayName,
    country: c.country,
    languages: c.languages,
    platforms: c.accounts.map((a) => a.platform),
    followers: c.followers,
    tier: c.tier,
    avgViews: c.avgViews,
    engagementRate: c.engagementRate,
    fit: c.fit,
    reasons: c.reasons,
    flags: c.flags,
    totalVideos: c.totalVideos ?? null,
    startedAt: c.startedAt ?? null,
    channelAgeYears: c.startedAt
      ? Math.max(0, Math.round(((Date.now() - Date.parse(c.startedAt)) / 31_557_600_000) * 10) / 10)
      : null,
    postCountInSample: c.recentContent.length,
    lastPublishedAt,
    daysSinceLastUpload: daysAgo(lastPublishedAt),
    peakViews: peak?.views ?? null,
    peakTitle: peak?.titleOrCaption ?? null,
    peakUrl: peak?.url ?? null,
    medianDaysBetweenUploads: median(gaps),
    posts: c.recentContent.slice(0, 8).map((p) => ({
      title: p.titleOrCaption,
      publishedAt: p.publishedAt,
      views: p.views,
      likes: p.likes,
      comments: p.comments,
      url: p.url,
    })),
    caveat:
      "Numbers come from this search sample (recent videos we already pulled), not a full channel audit or lifetime peak.",
  };
}

export function dossierToFacts(d: CreatorDossier) {
  const lines = [
    `Creator: ${d.name}`,
    `Country: ${d.country ?? "unknown"}`,
    `Languages: ${d.languages.join(", ") || "unknown"}`,
    `Platforms: ${d.platforms.join(", ") || "unknown"}`,
    `Followers in sample: ${d.followers || "unknown"}`,
    `Tier: ${d.tier}`,
    `Average views in sample: ${d.avgViews || "unknown"}`,
    `Engagement rate: ${(d.engagementRate * 100).toFixed(2)}%`,
    `Fit score: ${d.fit}`,
    `Why: ${d.reasons.join(" ") || "none"}`,
    `Flags: ${d.flags.join("; ") || "none"}`,
    `Total lifetime uploads (channel): ${d.totalVideos ?? "unknown"}`,
    `Channel started: ${d.startedAt ?? "unknown"}${d.channelAgeYears != null ? ` (~${d.channelAgeYears} years old)` : ""}`,
    `Posts in this sample: ${d.postCountInSample}`,
    `Last upload (sample): ${d.lastPublishedAt ?? "unknown"}`,
    `Days since last upload: ${d.daysSinceLastUpload ?? "unknown"}`,
    `Peak views in sample: ${d.peakViews ?? "unknown"}`,
    `Peak title: ${d.peakTitle ?? "unknown"}`,
    `Typical days between uploads in sample: ${d.medianDaysBetweenUploads ?? "unknown"}`,
    d.caveat,
    "Recent posts:",
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
    d.peakViews == null ? "peak views unknown in this sample" : `peak ${d.peakViews.toLocaleString()} views in this sample`;
  const cadence =
    d.medianDaysBetweenUploads == null
      ? "cadence unknown"
      : `about every ${d.medianDaysBetweenUploads} day${d.medianDaysBetweenUploads === 1 ? "" : "s"}`;
  return `${recency} · ${peak} · ${cadence}`;
}

function q(s: string) {
  return s.toLowerCase();
}

/** Deterministic answers so follow-ups work without an LLM key. */
export function answerFromFacts(question: string, d: CreatorDossier): string {
  const t = q(question);
  const sampleNote = ` ${d.caveat}`;

  if (/famous|popular|well.?known|household|society|celebrity|how big|reach|audience size/.test(t)) {
    const fol = d.followers > 0 ? `${d.followers.toLocaleString()} followers (${d.tier})` : `no public follower count (${d.tier} from what we have)`;
    const peak =
      d.peakViews == null
        ? "no peak view in this sample"
        : `${d.peakViews.toLocaleString()} views on the biggest video in this sample`;
    const vs =
      d.followers > 0 && d.peakViews
        ? d.peakViews >= d.followers
          ? " That peak is at or above their subscriber count, so those videos travelled beyond the regular audience."
          : " Peak views are below subscriber count in this sample, so reach looks more in-community than mass-famous."
        : "";
    return `We can't measure “fame in society” from this tool — only this search sample. ${d.name} looks like a ${d.tier} creator with ${fol}, country ${d.country ?? "unknown"}, and ${peak}.${vs} That is a useful collab signal, not proof they are a household name.${sampleNote}`;
  }

  if (/peak|highest|best.?perform|most view|viral|biggest/.test(t)) {
    if (d.peakViews == null || !d.peakTitle) {
      return `We don't have view counts in this sample for ${d.name}, so I can't name a peak.${sampleNote}`;
    }
    return `In this sample, the peak is ${d.peakViews.toLocaleString()} views on “${d.peakTitle}”. That is not necessarily their all-time high.${sampleNote}`;
  }

  if (/recent|last upload|how often|cadence|upload|posted|posting|active|inactive|fresh/.test(t) && !/what.*(post|video|content)/.test(t)) {
    const recency =
      d.daysSinceLastUpload == null
        ? "The last publish date is missing on the videos we have."
        : d.daysSinceLastUpload <= 7
          ? `They look active: last upload in this sample was ${d.daysSinceLastUpload} day(s) ago (${d.lastPublishedAt?.slice(0, 10)}).`
          : d.daysSinceLastUpload <= 30
            ? `Last upload in this sample was ${d.daysSinceLastUpload} days ago (${d.lastPublishedAt?.slice(0, 10)}). Still recent enough for a collab check.`
            : `Last upload in this sample was ${d.daysSinceLastUpload} days ago (${d.lastPublishedAt?.slice(0, 10)}). You may want to open the channel before outreach — they might have gone quiet.`;
    const cadence =
      d.medianDaysBetweenUploads == null
        ? ""
        : ` Across the dated videos here, they post about every ${d.medianDaysBetweenUploads} day(s).`;
    return `${recency}${cadence}${sampleNote}`;
  }

  if (/title|content|video|post|about|topic|what.*(they|she|he)|latest/.test(t)) {
    if (!d.posts.length) {
      return `No recent titles came back for ${d.name} in this search.${sampleNote}`;
    }
    const list = d.posts
      .slice(0, 5)
      .map((p) => `“${p.title}”${p.views != null ? ` (${p.views.toLocaleString()} views)` : ""}`)
      .join("; ");
    return `Recent titles in this sample: ${list}.${sampleNote}`;
  }

  if (/engag|like|comment|er\b/.test(t)) {
    return `Engagement rate in this sample is ${(d.engagementRate * 100).toFixed(2)}% with average views ${d.avgViews.toLocaleString()}.${sampleNote}`;
  }

  if (/fit|why|score|brand|collab|good/.test(t)) {
    return `${d.name} scored ${d.fit} fit. ${d.reasons.join(" ") || "No extra reasons stored."}${d.flags.length ? ` Watch-outs: ${d.flags.join("; ")}.` : ""}`;
  }

  if (/follower|size|tier|how big/.test(t)) {
    return `${d.name} is ${d.tier}${d.followers > 0 ? ` with ${d.followers.toLocaleString()} followers in this sample` : " (no public follower count here)"}.`;
  }

  return `I can only use this search sample. ${d.name}: ${snapshotLine(d)}. ${d.posts[0] ? `Latest title: “${d.posts[0].title}”.` : ""} ${d.caveat}`;
}
