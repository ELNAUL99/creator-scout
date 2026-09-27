"use client";

import { useMemo, useState } from "react";
import CheckDropdown from "@/components/CheckDropdown";
import { LegalNav, SiteFooter } from "@/components/Legal";
import { affiliateCode } from "@/lib/messages";
import { matchesSelectedCountries } from "@/lib/localeMatch";
import { followersMatchSize } from "@/lib/sizeRange";
import { MARKET_REGIONS, MARKETS } from "@/lib/markets";
import { NICHE_OPTIONS, NICHE_TERMS, type NicheId } from "@/lib/niches";
import type { DiscoverResponse, ScoredCreator, Platform } from "@/lib/types";
import type { RisingResponse } from "@/lib/trends";
import { BrandHomeLink } from "@/components/BrandHomeLink";
import ThemeToggle from "@/components/ThemeToggle";
import CreatorFollowUp from "@/components/CreatorFollowUp";

function compactCount(n: number) {
  if (!n || n <= 0) return null;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function trendPrefix(kind: string) {
  if (kind === "sound") return "♪";
  if (kind === "hashtag") return "#";
  return "";
}

function flagText(flags: unknown[]) {
  return flags
    .map((f) => {
      if (typeof f === "string") return f.trim();
      if (f && typeof f === "object") {
        const o = f as Record<string, unknown>;
        const text = o.text ?? o.reason ?? o.risk ?? o.message;
        if (typeof text === "string") return text.trim();
      }
      return "";
    })
    .filter(Boolean)
    .join("; ");
}

function csvEscape(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function toCsv(rows: ScoredCreator[]) {
  const header = [
    "Channel",
    "YouTube",
    "Latest content",
    "TikTok",
    "Instagram",
    "Market",
    "Country",
    "Language",
    "Followers",
    "Tier",
    "Avg views",
    "Peak live",
    "Engagement",
    "Fit",
    "Why",
    "Flags",
    "Suggested deal",
    "Contact route",
    "Affiliate code",
    "First message",
    "Source",
    "Date",
  ];
  const lines = [header.join(",")];
  for (const c of rows) {
    const yt = c.accounts.find((a) => a.platform === "youtube")?.url ?? "";
    const content = latestContentUrl(c) ?? "";
    const tt = c.accounts.find((a) => a.platform === "tiktok")?.url ?? "";
    const ig = c.accounts.find((a) => a.platform === "instagram")?.url ?? "";
    lines.push(
      [
        c.displayName,
        yt,
        content,
        tt,
        ig,
        c.searchedMarket,
        c.country ?? "",
        c.languages.join(" "),
        String(c.followers),
        c.tier,
        String(c.avgViews),
        c.peakLiveViewers != null ? String(c.peakLiveViewers) : "",
        `${(c.engagementRate * 100).toFixed(2)}%`,
        String(c.fit),
        c.reasons.join("; "),
        flagText(c.flags),
        c.suggestedDeal,
        c.contactRoute,
        affiliateCode(c.displayName),
        c.messageDraft,
        c.dataSource,
        c.dataDate,
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  return `\uFEFF${lines.join("\n")}`;
}

function channelUrl(c: ScoredCreator) {
  return c.accounts.find((a) => a.platform === "youtube")?.url ?? c.accounts[0]?.url ?? null;
}

function latestContentUrl(c: ScoredCreator) {
  const post = c.recentContent[0];
  if (post?.url) return post.url;
  const yt = c.accounts.find((a) => a.platform === "youtube");
  if (!yt) return c.accounts[0]?.url ?? null;
  const q = encodeURIComponent(`${c.displayName} ${post?.titleOrCaption ?? ""}`.trim());
  return `https://www.youtube.com/results?search_query=${q}`;
}

export default function ScoutApp({ judgeDemo = false }: { judgeDemo?: boolean }) {
  const [nicheIds, setNicheIds] = useState<NicheId[]>(() => (judgeDemo ? ["gaming"] : []));
  const [markets, setMarkets] = useState<string[]>(() => (judgeDemo ? ["VN"] : []));
  // Size filters (0 = no limit). Default: no limits — serve any creator size.
  const [followerMin, setFollowerMin] = useState(0);
  const [followerMax, setFollowerMax] = useState(0);
  const [viewMin, setViewMin] = useState(0);
  const [viewMax, setViewMax] = useState(0);
  const [platforms, setPlatforms] = useState<Platform[]>(() =>
    judgeDemo ? ["youtube"] : ["youtube", "tiktok", "instagram", "facebook", "twitch"],
  );
  const [includePresetCatalog, setIncludePresetCatalog] = useState(false);
  const [includePrenewCollabs, setIncludePrenewCollabs] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiscoverResponse | null>(null);
  const [shortlist, setShortlist] = useState<ScoredCreator[]>([]);
  const [gemsOnly, setGemsOnly] = useState(false);
  const [showFlagged, setShowFlagged] = useState(true);
  const [includeOtherCountries, setIncludeOtherCountries] = useState(false);
  const [ruledOut, setRuledOut] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trends, setTrends] = useState<RisingResponse | null>(null);
  const [brandWish, setBrandWish] = useState("");

  const { visible, hiddenFlagged, hiddenCountry, hiddenSize, hiddenGems } = useMemo(() => {
    if (!result) {
      return {
        visible: [] as ScoredCreator[],
        hiddenFlagged: 0,
        hiddenCountry: 0,
        hiddenSize: 0,
        hiddenGems: 0,
      };
    }
    const vMax = viewMax > 0 ? viewMax : Infinity;
    const viewsRanged = viewMin > 0 || viewMax > 0;
    let hiddenFlagged = 0;
    let hiddenCountry = 0;
    let hiddenSize = 0;
    let hiddenGems = 0;
    const visible = result.creators.filter((c) => {
      if (ruledOut.includes(c.id)) return false;
      // Twitch: skip follower bands (unknown). Avg views can still filter. Country already language-filtered.
      const twitch = c.accounts.some((a) => a.platform === "twitch");
      if (gemsOnly && !c.hiddenGem) {
        hiddenGems += 1;
        return false;
      }
      if (!showFlagged && c.flags.length > 0) {
        hiddenFlagged += 1;
        return false;
      }
      if (!twitch && !followersMatchSize(c.followers, followerMin, followerMax)) {
        hiddenSize += 1;
        return false;
      }
      if (viewsRanged) {
        if (c.avgViews <= 0 || c.avgViews < viewMin || c.avgViews > vMax) {
          hiddenSize += 1;
          return false;
        }
      }
      if (!twitch && markets.length && !includeOtherCountries) {
        const searched = (c.searchedMarket ?? "").toUpperCase();
        // Server already kept this row for the selected market (language or ISO).
        // Do not re-check YouTube's often-wrong channel.country — that hid 3 of 4.
        if (searched && searched !== "WW" && markets.some((m) => m.toUpperCase() === searched)) {
          return true;
        }
        const text = `${c.displayName} ${c.languages.join(" ")} ${c.recentContent.map((p) => p.titleOrCaption).join(" ")}`;
        const market = MARKETS.find((m) => m.code === c.searchedMarket);
        const local = matchesSelectedCountries(c.country, markets, {
          language: market?.language ?? c.languages[0] ?? "en",
          text,
          videoLanguages: [
            ...c.languages,
            ...c.recentContent.map((p) => p.language).filter(Boolean),
          ] as string[],
        });
        if (!local) {
          hiddenCountry += 1;
          return false;
        }
      }
      return true;
    });
    return { visible, hiddenFlagged, hiddenCountry, hiddenSize, hiddenGems };
  }, [result, gemsOnly, showFlagged, includeOtherCountries, markets, followerMin, followerMax, viewMin, viewMax, ruledOut]);

  const PAGE_SIZE = 20;
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function run() {
    setLoading(true);
    setError(null);
    setTrends(null);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: [brandWish.trim(), ...nicheIds.map((id) => NICHE_TERMS[id].label)].filter(Boolean).join(". "),
          nicheIds,
          markets,
          sizeMin: followerMin,
          sizeMax: followerMax > 0 ? followerMax : 100_000_000,
          includeNano: followerMin <= 0,
          includeMacro: followerMax <= 0,
          timeWindowDays: 90,
          platforms,
          mode: "auto",
          webDiscover: true,
          includePresetCatalog,
          includePrenewCollabs,
          localOnly: markets.length > 0 && !includeOtherCountries,
          brand: brandWish.trim() ? { pitch: brandWish.trim() } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResult(data);
      if (data.error) setError(data.error);
      setShortlist([]);
      setRuledOut([]);
      setPage(1);
      setGemsOnly(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function runTrends() {
    setTrendsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nicheIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Trends failed");
      setTrends(data);
      if (data.error) setError(data.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trends failed");
    } finally {
      setTrendsLoading(false);
    }
  }

  function addToShortlist(c: ScoredCreator) {
    setShortlist((s) => (s.some((x) => x.id === c.id) ? s : [...s, c]));
  }

  function ruleOut(c: ScoredCreator) {
    setRuledOut((ids) => (ids.includes(c.id) ? ids : [...ids, c.id]));
    setShortlist((s) => s.filter((x) => x.id !== c.id));
  }

  function exportCsv(rows: ScoredCreator[]) {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "creator-scout-shortlist.csv";
    a.click();
  }

  async function copySheets(rows: ScoredCreator[]) {
    const text = toCsv(rows).replace(/","/g, "\t").replace(/^"|"$/gm, "").replace(/""/g, '"');
    const tsv = rows
      .map((c) =>
        [
          c.displayName,
          c.accounts.find((a) => a.platform === "youtube")?.url ?? "",
          latestContentUrl(c) ?? "",
          c.searchedMarket,
          c.followers,
          c.tier,
          c.fit,
          c.reasons.join("; "),
          c.suggestedDeal,
          c.messageDraft,
        ].join("\t"),
      )
      .join("\n");
    await navigator.clipboard.writeText(
      `Channel\tYouTube\tContent\tMarket\tFollowers\tTier\tFit\tWhy\tDeal\tMessage\n${tsv}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    void text;
  }

  const gems = result?.creators.filter((c) => c.hiddenGem).length ?? 0;
  const under50 = result?.creators.filter((c) => c.followers < 50_000).length ?? 0;

  return (
    <div className="min-h-full flex flex-col text-foreground">
      <header className="border-b border-border px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <BrandHomeLink />
        <div className="flex items-center gap-3">
          <LegalNav />
          <ThemeToggle />
        </div>
      </header>

      <div className="px-6 py-3 bg-accent-soft text-sm text-foreground border-b border-border">
        {judgeDemo ? (
          <>
            Judge path: Gaming × Vietnam × YouTube. Demo catalog is off, so <strong>Showing</strong> should match{" "}
            <strong>Found</strong>. Click Run discovery, open a card, then ask a follow-up. YouTube is live API —
            TikTok/Instagram only via Connect. Nothing is sent to creators.
          </>
        ) : (
          <>
            Pick a niche and a short brief, then search. TikTok and Instagram only add the account you Connect.
            No fake accounts, proxies, or login bypass.
          </>
        )}
      </div>

      <main className="mx-auto max-w-6xl px-6 py-8 grid gap-8 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5">
          <CheckDropdown
            label="Niche"
            placeholder="Select niches…"
            selected={nicheIds}
            onChange={(next) => setNicheIds(next as NicheId[])}
            groupToggle={false}
            groups={[{ label: "Niches", items: NICHE_OPTIONS.map((n) => ({ value: n.id, label: n.label })) }]}
          />
          {nicheIds.length === 0 && (
            <p className="text-xs text-red-400">Pick at least one niche.</p>
          )}
          <CheckDropdown
            label="Country"
            placeholder="Any country (worldwide by default)…"
            searchable
            selected={markets}
            onChange={setMarkets}
            groups={MARKET_REGIONS.map((region) => ({
              label: region,
              items: MARKETS.filter((m) => m.region === region).map((m) => ({
                value: m.code,
                label: m.name,
              })),
            }))}
          />
          {markets.length === 0 && (
            <p className="text-xs text-muted">No country selected — worldwide. If you pick a country, only that country’s channels are listed.</p>
          )}
          {markets.length > 0 && (
            <p className="text-xs text-muted">
              Default: creators in {markets.join(", ")}. Search runs in English and that country’s language. English-only
              foreign channels still stay out unless they look aimed at that audience.
            </p>
          )}
          <div className="space-y-2">
            <p className="text-sm">Brief</p>
            <textarea
              rows={3}
              value={brandWish}
              onChange={(e) => setBrandWish(e.target.value)}
              placeholder="e.g. honest reviews, weekly recaps, not luxury unboxings"
              className="w-full field p-2 text-sm"
            />
            <p className="text-xs text-muted">
              Search uses this plus the niche. Fit is scored from the YouTube (or connected) profile we actually pulled.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm">Platforms</p>
            <div className="flex flex-wrap gap-2">
              {([
                { id: "youtube", label: "YouTube" },
                { id: "tiktok", label: "TikTok" },
                { id: "instagram", label: "Instagram" },
                { id: "facebook", label: "Facebook" },
                { id: "twitch", label: "Twitch" },
              ] as { id: Platform; label: string }[]).map((p) => {
                const on = platforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setPlatforms((cur) =>
                        cur.includes(p.id) ? cur.filter((x) => x !== p.id) : [...cur, p.id],
                      )
                    }
                    className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                      on
                        ? "bg-accent text-accent-foreground border-transparent"
                        : "bg-surface border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            {platforms.length === 0 && (
              <p className="text-xs text-red-400">Pick at least one platform.</p>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm">Followers / subscribers</p>
              {(followerMin > 0 || followerMax > 0) && (
                <button
                  type="button"
                  className="text-xs text-accent-text"
                  onClick={() => {
                    setFollowerMin(0);
                    setFollowerMax(0);
                  }}
                >
                  Any size
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Nano <10k", min: 0, max: 10_000 },
                { label: "Micro 10–50k", min: 10_000, max: 50_000 },
                { label: "50–100k", min: 50_000, max: 100_000 },
                { label: "Mid 50–250k", min: 50_000, max: 250_000 },
                { label: "Macro 250k–1M", min: 250_000, max: 1_000_000 },
                { label: "Mega 1M+", min: 1_000_000, max: 0 },
              ].map((p) => {
                const on = followerMin === p.min && followerMax === p.max;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setFollowerMin(p.min);
                      setFollowerMax(p.max);
                      setPage(1);
                    }}
                    className={`rounded-full px-2.5 py-1 text-xs border transition-colors ${
                      on
                        ? "bg-accent text-accent-foreground border-transparent"
                        : "bg-surface border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted">
              YouTube does not search “everyone with 50–100k subs.” It returns channels/videos for your brief, then Scout
              drops hits outside this range. A mid-tier creator only appears if YouTube included them in those hits.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                placeholder="Min"
                value={followerMin || ""}
                onChange={(e) => setFollowerMin(Math.max(0, Number(e.target.value) || 0))}
                className="w-full field p-2 text-sm"
              />
              <span className="text-muted text-sm">–</span>
              <input
                type="number"
                min={0}
                placeholder="Max (any)"
                value={followerMax || ""}
                onChange={(e) => setFollowerMax(Math.max(0, Number(e.target.value) || 0))}
                className="w-full field p-2 text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm">Avg views per video</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                placeholder="Min"
                value={viewMin || ""}
                onChange={(e) => setViewMin(Math.max(0, Number(e.target.value) || 0))}
                className="w-full field p-2 text-sm"
              />
              <span className="text-muted text-sm">–</span>
              <input
                type="number"
                min={0}
                placeholder="Max (any)"
                value={viewMax || ""}
                onChange={(e) => setViewMax(Math.max(0, Number(e.target.value) || 0))}
                className="w-full field p-2 text-sm"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includePresetCatalog}
              onChange={(e) => setIncludePresetCatalog(e.target.checked)}
            />
            Include demo catalog (300 fictional creators per country — 5 per niche on each of TikTok / Instagram / Facebook / Twitch)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includePrenewCollabs}
              onChange={(e) => setIncludePrenewCollabs(e.target.checked)}
            />
            Also list names from the hackathon collab spreadsheet (not YouTube — those people only appear if you tick this)
          </label>
          <button
            type="button"
            onClick={run}
            disabled={loading || trendsLoading || nicheIds.length === 0 || platforms.length === 0}
            className="w-full btn-primary font-medium py-2.5"
          >
            {loading ? "Searching…" : "Run discovery"}
          </button>
          <button
            type="button"
            onClick={runTrends}
            disabled={trendsLoading || loading || nicheIds.length === 0}
            className="w-full border border-border-strong rounded-lg py-2.5 text-sm font-medium hover:border-accent"
          >
            {trendsLoading ? "Loading hot search…" : "TikTok hot search"}
          </button>
          <p className="text-xs text-muted">
            Hashtags and sounds follow the niche you picked. Breakout accounts under the bubbles are demo creators in that niche.
          </p>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </aside>

        <section className="space-y-5">
          {trends && (
            <div className="space-y-4">
              <div>
                <h2 className="font-medium text-lg">TikTok hot search</h2>
                <p className="text-xs text-muted">
                  Smaller bubbles are hashtags and sounds for your selected niche. The number underneath is attributed
                  viewership for that trend — labelled demo, not a TikTok crawl.
                </p>
                {trends.trends.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-4">
                    {trends.trends.slice(0, 14).map((t) => {
                      const views = compactCount(t.views);
                      return (
                        <div key={`${t.kind}-${t.label}`} className="w-[4.75rem] flex flex-col items-center text-center">
                          <span className="inline-flex max-w-full items-center justify-center rounded-full bg-accent-soft px-2 py-1 text-[10px] font-medium leading-tight text-accent-text">
                            <span className="truncate">
                              {trendPrefix(t.kind)}
                              {t.label.replace(/^#/, "")}
                            </span>
                          </span>
                          <span className="mt-1 text-[10px] font-semibold tabular-nums text-foreground">
                            {views ? `${views} views` : "views n/a"}
                          </span>
                          <span className="text-[9px] capitalize text-muted">{t.kind === "sound" ? "sound" : t.kind}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : trends.suggestions?.length ? (
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-4">
                    {trends.suggestions.map((s) => (
                      <div key={s} className="w-[4.75rem] flex flex-col items-center text-center">
                        <span className="inline-flex max-w-full items-center justify-center rounded-full bg-accent-soft px-2 py-1 text-[10px] font-medium text-accent-text">
                          <span className="truncate">#{s}</span>
                        </span>
                        <span className="mt-1 text-[10px] text-muted">views n/a</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              {trends.notes.map((n) => (
                <p key={n} className="text-xs text-amber-500">
                  {n}
                </p>
              ))}
              {trends.trends.some((t) => t.hits.some((h) => h.breakout && h.views > 0)) && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Breakout videos on these trends</p>
                    <p className="text-xs text-muted">
                      Small accounts (labelled demo). The video named is the one that picked up views from that
                      hashtag or sound — not a full creator search.
                    </p>
                  </div>
                  {trends.trends.slice(0, 14).map((t) => {
                    const examples = t.hits
                      .filter((h) => h.breakout && h.views > 0)
                      .sort((a, b) => b.viewsPerSub - a.viewsPerSub)
                      .slice(0, 2);
                    if (!examples.length) return null;
                    const prefix = t.kind === "sound" ? "♪ " : "#";
                    return (
                      <div key={`ex-${t.kind}-${t.label}`} className="card-sm p-3 space-y-2">
                        <p className="text-xs font-medium text-accent-text">
                          {prefix}
                          {t.label.replace(/^#/, "")}
                        </p>
                        {examples.map((h) => (
                          <article key={h.videoId} className="text-sm space-y-0.5">
                            <p>
                              <a href={h.channelUrl} target="_blank" rel="noreferrer" className="font-medium hover:text-accent-text">
                                {h.channelTitle}
                              </a>{" "}
                              <span className="text-xs text-muted">
                                {h.followers.toLocaleString()} followers · {(h.viewsPerSub).toFixed(0)}× views/follower
                              </span>
                            </p>
                            <p>
                              <a href={h.videoUrl} target="_blank" rel="noreferrer" className="text-accent-text text-xs">
                                {h.videoTitle}
                              </a>
                            </p>
                            <p className="text-[11px] text-muted">
                              {compactCount(h.views) ?? h.views.toLocaleString()} views on this video because of{" "}
                              {t.kind === "sound" ? `sound “${t.label}”` : `#${t.label.replace(/^#/, "")}`}
                            </p>
                          </article>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!result && !trends && (
            <div className="card p-8 text-muted">
              <p className="text-lg text-foreground">Pick a niche and a country. Local terms. Ranked, explained — then ask follow-ups before you shortlist.</p>
              <p className="mt-2 text-sm">
                Try a niche and a country from the dropdowns — local terms still run per market.
              </p>
            </div>
          )}

          {result && (
            <>
              <div className="flex flex-wrap gap-3">
                <Stat label="Showing" value={String(visible.length)} />
                <Stat label="Found" value={String(result.creators.length)} />
                <Stat label="Under 50k" value={String(under50)} />
                <Stat label="Hidden gems" value={String(gems)} />
                <Stat label="Hours saved*" value={String(result.hoursSavedEstimate)} />
                <Stat label="API units" value={String(result.apiUnitsUsed)} />
                <Stat label="Mode" value={result.mode} />
              </div>
              <p className="text-xs text-muted">*4 minutes per creator vs manual scrolling.</p>
              {(visible.length < result.creators.length || (result.creators.length > 0 && visible.length === 0)) && (
                <p className="text-sm text-amber-500">
                  Showing {visible.length} of {result.creators.length} found.
                  {hiddenGems > 0 ? ` ${hiddenGems} hidden by “Hidden gems only”.` : ""}
                  {hiddenFlagged > 0 ? ` ${hiddenFlagged} hidden by brand-risk flags.` : ""}
                  {hiddenCountry > 0 ? ` ${hiddenCountry} hidden — not in the selected country.` : ""}
                  {hiddenSize > 0
                    ? ` ${hiddenSize} outside the follower/view range (unknown subscriber counts are excluded).`
                    : ""}
                </p>
              )}
              {result.notes.map((n) => (
                <p key={n} className="text-xs text-amber-500">
                  {n}
                </p>
              ))}
              <div className="card-sm p-3 text-sm max-h-80 overflow-y-auto">
                <p className="text-muted mb-1">Local search terms</p>
                {result.termsPerMarket[0]?.originalTerms?.length ? (
                  <p className="text-xs mb-2">
                    Original (English): {result.termsPerMarket[0].originalTerms.join(", ")}
                  </p>
                ) : null}
                <ul className="space-y-1">
                  {result.termsPerMarket.map((t) => (
                    <li key={t.country}>
                      <span className="text-accent-text">{t.countryName ?? t.country}</span>{" "}
                      <span className="text-muted">
                        ({t.languageName ?? t.language}
                        {t.region ? ` · ${t.region}` : ""})
                      </span>{" "}
                      — {t.terms.join(", ")}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <label className="text-sm flex gap-2">
                  <input type="checkbox" checked={gemsOnly} onChange={(e) => setGemsOnly(e.target.checked)} />
                  Hidden gems only
                </label>
                <label className="text-sm flex gap-2">
                  <input
                    type="checkbox"
                    checked={showFlagged}
                    onChange={(e) => setShowFlagged(e.target.checked)}
                  />
                  Show brand-risk flags
                </label>
                <label className="text-sm flex gap-2">
                  <input
                    type="checkbox"
                    checked={includeOtherCountries}
                    disabled={markets.length === 0}
                    onChange={(e) => setIncludeOtherCountries(e.target.checked)}
                  />
                  Include other countries
                </label>
                <button
                  type="button"
                  className="text-sm underline"
                  onClick={() => exportCsv(shortlist.length ? shortlist : visible)}
                >
                  Export CSV
                </button>
                <button type="button" className="text-sm underline" onClick={() => copySheets(shortlist.length ? shortlist : visible)}>
                  {copied ? "Copied for Sheets" : "Copy for Google Sheets"}
                </button>
                <span className="text-sm text-muted">Shortlist {shortlist.length}</span>
                {ruledOut.length > 0 && (
                  <button type="button" className="text-sm underline" onClick={() => setRuledOut([])}>
                    Restore {ruledOut.length} ruled out
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {paged.map((c) => {
                  const channel = channelUrl(c);
                  const content = latestContentUrl(c);
                  return (
                  <article key={c.id} className="card p-4">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <h2 className="font-medium text-lg">
                          {channel ? (
                            <a href={channel} target="_blank" rel="noreferrer" className="hover:text-accent-text">
                              {c.displayName}
                            </a>
                          ) : (
                            c.displayName
                          )}{" "}
                          <span className="text-accent-text text-sm">{c.fit} fit</span>
                          {c.hiddenGem && (
                            <span className="ml-2 text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                              Hidden gem
                            </span>
                          )}
                        </h2>
                        <p className="text-xs text-muted">
                          {c.searchedMarket} · {c.tier} ·{" "}
                          {c.followers > 0
                            ? `${c.followers.toLocaleString()} followers`
                            : c.accounts.some((a) => a.platform === "twitch")
                              ? [
                                  c.avgViews > 0 ? `${c.avgViews.toLocaleString()} avg views` : "avg views n/a",
                                  (c.peakLiveViewers ?? 0) > 0
                                    ? `${c.peakLiveViewers!.toLocaleString()} peak live`
                                    : "peak live n/a",
                                ].join(" · ")
                              : "no public follower count"}
                          {c.accounts.some((a) => (a.followers ?? 0) > 0 && a.followers !== c.followers)
                            ? ` (${c.accounts
                                .filter((a) => (a.followers ?? 0) > 0)
                                .map((a) => `${a.platform} ${a.followers!.toLocaleString()}`)
                                .join(", ")})`
                            : ""}{" "}
                          · ER {(c.engagementRate * 100).toFixed(2)}% · {c.scoringMode} · {c.dataSource} · {c.dataDate}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {channel && (
                          <a
                            href={channel}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs border border-border rounded px-2 py-1 hover:border-accent"
                          >
                            Channel
                          </a>
                        )}
                        {content && (
                          <a
                            href={content}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs rounded px-2 py-1 bg-accent text-accent-foreground font-medium"
                          >
                            Content
                          </a>
                        )}
                        <button
                          type="button"
                          className="text-xs border border-border rounded px-2"
                          onClick={() => addToShortlist(c)}
                        >
                          Shortlist
                        </button>
                        <button
                          type="button"
                          className="text-xs border border-red-900/60 text-red-300 rounded px-2"
                          onClick={() => ruleOut(c)}
                        >
                          Rule out
                        </button>
                        <button
                          type="button"
                          className="text-xs border border-border rounded px-2"
                          onClick={() => setOpenId(openId === c.id ? null : c.id)}
                        >
                          {openId === c.id ? "Hide" : "Why"}
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.accounts.map((a) => (
                        <a
                          key={a.platform + a.handle}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] px-2 py-0.5 rounded-full bg-surface-2 text-muted"
                        >
                          {a.platform} · {a.source}
                        </a>
                      ))}
                    </div>
                    {c.youtube && (
                      <p className="mt-2 text-[11px] text-muted">
                        Channel: {c.youtube.videoCount.toLocaleString()} videos
                        {c.youtube.lifetimeViews
                          ? ` · ${c.youtube.lifetimeViews.toLocaleString()} lifetime views`
                          : ""}
                        {c.youtube.hiddenSubscribers ? " · subscriber count hidden" : ""}
                        {c.startedAt ? ` · started ${c.startedAt.slice(0, 10)}` : ""}
                        {c.youtube.topics.length ? ` · ${c.youtube.topics.slice(0, 3).join(", ")}` : ""}
                      </p>
                    )}
                    {c.recentContent.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-muted">
                        {c.recentContent.slice(0, 8).map((p) => (
                          <li key={p.postId}>
                            {p.url ? (
                              <a href={p.url} target="_blank" rel="noreferrer" className="text-accent-text hover:underline">
                                {p.titleOrCaption}
                              </a>
                            ) : (
                              p.titleOrCaption
                            )}
                            {p.views != null && <span> · {p.views.toLocaleString()} views</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                    {flagText(c.flags) && (
                      <p className="mt-2 text-xs text-red-300">
                        {flagText(c.flags).replace(/; /g, " · ")}
                      </p>
                    )}
                    {openId === c.id && (
                      <div className="mt-3 text-sm space-y-2 text-muted">
                        <p>{c.reasons.join(" ")}</p>
                        {c.llmReasons.length > 0 && (
                          <p className="text-accent-text">LLM: {c.llmReasons.join(" ")}</p>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                          {Object.entries(c.components).map(([k, v]) => (
                            <div key={k} className="bg-surface-2 rounded p-2">
                              <div className="text-muted">{k}</div>
                              <div>{v}</div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs">
                          Deal: {c.suggestedDeal} · {c.contactRoute}
                        </p>
                        <pre className="whitespace-pre-wrap text-xs bg-surface-2 p-3 rounded-lg">{c.messageDraft}</pre>
                        <CreatorFollowUp key={c.id} creator={c} />
                      </div>
                    )}
                  </article>
                  );
                })}
              </div>
              {visible.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-muted">
                    {visible.length === 0
                      ? "No rows"
                      : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, visible.length)} of ${visible.length}`}
                    {ruledOut.length > 0 ? ` · ${ruledOut.length} ruled out` : ""}
                  </span>
                  {pageCount > 1 && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-xs border border-border rounded px-2 py-1 disabled:opacity-40"
                        disabled={safePage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      <span className="text-muted self-center">
                        Page {safePage} / {pageCount}
                      </span>
                      <button
                        type="button"
                        className="text-xs border border-border rounded px-2 py-1 disabled:opacity-40"
                        disabled={safePage >= pageCount}
                        onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-sm px-3.5 py-2.5 min-w-[104px]">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}
