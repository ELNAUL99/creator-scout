"use client";

import { useEffect, useMemo, useState } from "react";
import CheckDropdown from "@/components/CheckDropdown";
import { LegalNav, SiteFooter } from "@/components/Legal";
import { belongsToMarket } from "@/lib/localeMatch";
import { MARKET_REGIONS, MARKETS } from "@/lib/markets";
import { NICHE_OPTIONS, NICHE_TERMS, type NicheId } from "@/lib/niches";
import type { DiscoverResponse, ScoredCreator, Platform } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { BrandHomeLink } from "@/components/BrandHomeLink";
import ThemeToggle from "@/components/ThemeToggle";

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
        `${(c.engagementRate * 100).toFixed(2)}%`,
        String(c.fit),
        c.reasons.join("; "),
        c.flags.join("; "),
        c.suggestedDeal,
        c.contactRoute,
        `PRENEW-${c.displayName.replace(/[^A-Za-z0-9]/g, "").slice(0, 10).toUpperCase()}`,
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

export default function ScoutApp() {
  const [nicheIds, setNicheIds] = useState<NicheId[]>([]);
  const [markets, setMarkets] = useState<string[]>([]);
  // Size filters (0 = no limit). Default: no limits — serve any creator size.
  const [followerMin, setFollowerMin] = useState(0);
  const [followerMax, setFollowerMax] = useState(0);
  const [viewMin, setViewMin] = useState(0);
  const [viewMax, setViewMax] = useState(0);
  const [platforms, setPlatforms] = useState<Platform[]>(["youtube", "tiktok", "instagram"]);
  const [searchConfigured, setSearchConfigured] = useState(false);
  const [instagramConfigured, setInstagramConfigured] = useState(false);
  const [webDiscover, setWebDiscover] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiscoverResponse | null>(null);
  const [shortlist, setShortlist] = useState<ScoredCreator[]>([]);
  const [gemsOnly, setGemsOnly] = useState(false);
  const [showFlagged, setShowFlagged] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d: { youtubeConfigured?: boolean; searchConfigured?: boolean; instagramConfigured?: boolean }) => {
        setSearchConfigured(Boolean(d.searchConfigured));
        setInstagramConfigured(Boolean(d.instagramConfigured));
      })
      .catch(() => {});
  }, []);

  const visible = useMemo(() => {
    if (!result) return [];
    const fMax = followerMax > 0 ? followerMax : Infinity;
    const vMax = viewMax > 0 ? viewMax : Infinity;
    return result.creators.filter((c) => {
      if (gemsOnly && !c.hiddenGem) return false;
      if (!showFlagged && c.flags.length > 0) return false;
      // Follower / subscriber range (only filter creators whose count is known).
      if (c.followers > 0 && (c.followers < followerMin || c.followers > fMax)) return false;
      // Avg-views range (only filter creators whose avg views is known).
      if (c.avgViews > 0 && (c.avgViews < viewMin || c.avgViews > vMax)) return false;
      // Always constrain to the selected country: a country search returns only that country.
      const text = `${c.displayName} ${c.recentContent.map((p) => p.titleOrCaption).join(" ")}`;
      return belongsToMarket({
        channelCountry: c.country,
        targetMarket: c.searchedMarket,
        language: c.languages[0] ?? "en",
        text,
      });
    });
  }, [result, gemsOnly, showFlagged, followerMin, followerMax, viewMin, viewMax]);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: nicheIds.map((id) => NICHE_TERMS[id].label).join(", "),
          nicheIds,
          markets,
          sizeMin: followerMin,
          sizeMax: followerMax > 0 ? followerMax : 100_000_000,
          // Don't let the server pre-drop by tier — the range filters below handle sizing.
          includeNano: true,
          includeMacro: true,
          timeWindowDays: 90,
          platforms,
          mode: "auto",
          webDiscover,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResult(data);
      setShortlist([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function addToShortlist(c: ScoredCreator) {
    setShortlist((s) => (s.some((x) => x.id === c.id) ? s : [...s, c]));
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
          <button
            onClick={async () => {
              const supabase = await createSupabaseBrowserClient();
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="text-sm text-muted hover:text-accent-text"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="px-6 py-3 bg-accent-soft text-sm text-foreground border-b border-border">
        Demo path: discover TikTok/Instagram handles with search-engine <code className="text-accent-text">site:</code>{" "}
        queries, pull live Instagram stats via Graph Business Discovery, score a real TikTok profile with
        Scout Lens. Production swaps step 1 for a licensed data API; everything else stays. No fake accounts,
        proxies, or login bypass.
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
            placeholder="Select countries…"
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
            <p className="text-xs text-red-400">Pick at least one country.</p>
          )}
          <p className="text-xs text-muted">
            Results are limited to the countries you select — a country search returns only creators from that country.
          </p>
          <div className="space-y-2">
            <p className="text-sm">Platforms</p>
            <div className="flex flex-wrap gap-2">
              {([
                { id: "youtube", label: "YouTube" },
                { id: "tiktok", label: "TikTok" },
                { id: "instagram", label: "Instagram" },
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
              {["Facebook", "Twitch"].map((label) => (
                <span
                  key={label}
                  title="Coming soon"
                  className="rounded-full px-3 py-1 text-sm border border-border bg-surface-2 text-muted opacity-60 cursor-not-allowed select-none"
                >
                  {label} · soon
                </span>
              ))}
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
            <input type="checkbox" checked={webDiscover} onChange={(e) => setWebDiscover(e.target.checked)} />
            Find TikTok / Instagram via site: search
          </label>
          <p className="text-xs text-muted">
            {searchConfigured
              ? "Search API is set. Queries like site:tiktok.com “pelikone” return indexed public profiles."
              : "Add GOOGLE_CSE_KEY + GOOGLE_CSE_CX (or BRAVE_SEARCH_API_KEY) to .env.local for live handles. Or load Scout Lens on a profile."}
            {instagramConfigured
              ? " Instagram Graph Business Discovery is on."
              : " Optional: INSTAGRAM_GRAPH_TOKEN + INSTAGRAM_BUSINESS_ID for live IG follower/post stats."}
          </p>
          <p className="text-xs text-muted">
            Untick biggest names to keep the micro/mid shortlist. Search still finds them when the box is on.
            Load unpacked <code>extension/</code> in Opera (opera://extensions) and open a TikTok profile for the live score card.
          </p>
          <button
            type="button"
            onClick={run}
            disabled={loading || markets.length === 0 || nicheIds.length === 0 || platforms.length === 0}
            className="w-full btn-primary font-medium py-2.5"
          >
            {loading ? "Searching…" : "Run discovery"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </aside>

        <section className="space-y-5">
          {!result && (
            <div className="card p-8 text-muted">
              <p className="text-lg text-foreground">Pick a niche and a country. Local terms. Ranked, explained, outreach-ready.</p>
              <p className="mt-2 text-sm">
                Try a niche and a country from the dropdowns — local terms still run per market.
              </p>
            </div>
          )}

          {result && (
            <>
              <div className="flex flex-wrap gap-3">
                <Stat label="Creators" value={String(result.creators.length)} />
                <Stat label="Under 50k" value={String(under50)} />
                <Stat label="Hidden gems" value={String(gems)} />
                <Stat label="Hours saved*" value={String(result.hoursSavedEstimate)} />
                <Stat label="API units" value={String(result.apiUnitsUsed)} />
                <Stat label="Mode" value={result.mode} />
              </div>
              <p className="text-xs text-muted">*4 minutes per creator vs manual scrolling.</p>
              {result.notes.map((n) => (
                <p key={n} className="text-xs text-amber-500">
                  {n}
                </p>
              ))}
              <div className="card-sm p-3 text-sm">
                <p className="text-muted mb-2">Local search terms</p>
                <ul className="space-y-1">
                  {result.termsPerMarket.map((t) => (
                    <li key={t.country}>
                      <span className="text-accent-text">{t.country}</span>{" "}
                      <span className="text-muted">({t.source})</span> — {t.terms.join(", ")}
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
              </div>
              <div className="space-y-3">
                {visible.map((c) => {
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
                          {c.followers > 0 ? c.followers.toLocaleString() : "followers via Lens / IG Graph"} · ER{" "}
                          {(c.engagementRate * 100).toFixed(2)}% · {c.scoringMode} · {c.dataSource} · {c.dataDate}
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
                    {c.recentContent.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-muted">
                        {c.recentContent.slice(0, 3).map((p) => (
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
                    {c.flags.length > 0 && (
                      <p className="mt-2 text-xs text-red-300">{c.flags.join(" · ")}</p>
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
                      </div>
                    )}
                  </article>
                  );
                })}
              </div>
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
