"use client";

import { useEffect, useMemo, useState } from "react";
import CheckDropdown from "@/components/CheckDropdown";
import { LegalNav, SiteFooter } from "@/components/Legal";
import { belongsToMarket } from "@/lib/localeMatch";
import { DEFAULT_MARKETS, MARKET_REGIONS, MARKETS } from "@/lib/markets";
import { NICHE_OPTIONS, NICHE_TERMS, type NicheId } from "@/lib/niches";
import type { DiscoverResponse, ScoredCreator } from "@/lib/types";

const SELECT_CLASS = "mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm";

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
  const [markets, setMarkets] = useState<string[]>(DEFAULT_MARKETS);
  const [includeNano, setIncludeNano] = useState(true);
  const [includeMacro, setIncludeMacro] = useState(true);
  const [localOnly, setLocalOnly] = useState(true);
  const [mode, setMode] = useState<"auto" | "sample" | "live">("auto");
  const [youtubeKey, setYoutubeKey] = useState("");
  const [serverHasKey, setServerHasKey] = useState(false);
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
    const stored = localStorage.getItem("creator-scout-yt-key");
    if (stored) setYoutubeKey(stored);
    fetch("/api/status")
      .then((r) => r.json())
      .then((d: { youtubeConfigured?: boolean; searchConfigured?: boolean; instagramConfigured?: boolean }) => {
        setServerHasKey(Boolean(d.youtubeConfigured));
        setSearchConfigured(Boolean(d.searchConfigured));
        setInstagramConfigured(Boolean(d.instagramConfigured));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (youtubeKey) localStorage.setItem("creator-scout-yt-key", youtubeKey);
  }, [youtubeKey]);

  const visible = useMemo(() => {
    if (!result) return [];
    return result.creators.filter((c) => {
      if (gemsOnly && !c.hiddenGem) return false;
      if (!showFlagged && c.flags.length > 0) return false;
      if (!includeNano && c.followers > 0 && c.followers < 10_000) return false;
      if (!includeMacro && c.followers >= 250_000) return false;
      if (localOnly) {
        const text = `${c.displayName} ${c.recentContent.map((p) => p.titleOrCaption).join(" ")}`;
        return belongsToMarket({
          channelCountry: c.country,
          targetMarket: c.searchedMarket,
          language: c.languages[0] ?? "en",
          text,
        });
      }
      return true;
    });
  }, [result, gemsOnly, showFlagged, includeNano, includeMacro, localOnly]);

  async function run() {
    if (mode === "live" && !youtubeKey.trim() && !serverHasKey) {
      setError(
        "Live YouTube needs an API key. Paste it above, or add YOUTUBE_API_KEY to .env.local and restart npm run dev.",
      );
      return;
    }
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
          sizeMin: 10_000,
          sizeMax: 250_000,
          includeNano,
          includeMacro,
          timeWindowDays: 90,
          platforms: ["youtube", "tiktok", "instagram"],
          mode,
          youtubeApiKey: youtubeKey || undefined,
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
    <div className="min-h-full flex flex-col bg-[#0b0f0c] text-zinc-100">
      <header className="border-b border-emerald-900/40 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400">Prenew hackathon</p>
          <h1 className="text-xl font-semibold tracking-tight">Creator Scout</h1>
        </div>
        <LegalNav />
      </header>

      <div className="px-6 py-3 bg-emerald-950/40 text-sm text-emerald-100/90 border-b border-emerald-900/40">
        Demo path: discover TikTok/Instagram handles with search-engine <code className="text-emerald-300">site:</code>{" "}
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
          <p className="text-xs text-zinc-500">
            Use Clear all, then tick only Vietnam if you want that market alone. YouTube still returns global channels for VN unless local filter is on.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={localOnly} onChange={(e) => setLocalOnly(e.target.checked)} />
            Only creators from the selected country
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeNano} onChange={(e) => setIncludeNano(e.target.checked)} />
            Include nano (under 10k)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeMacro} onChange={(e) => setIncludeMacro(e.target.checked)} />
            Include biggest names (250k+)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={webDiscover} onChange={(e) => setWebDiscover(e.target.checked)} />
            Find TikTok / Instagram via site: search
          </label>
          <p className="text-xs text-zinc-500">
            {searchConfigured
              ? "Search API is set. Queries like site:tiktok.com “pelikone” return indexed public profiles."
              : "Add GOOGLE_CSE_KEY + GOOGLE_CSE_CX (or BRAVE_SEARCH_API_KEY) to .env.local for live handles. Or load Scout Lens on a profile."}
            {instagramConfigured
              ? " Instagram Graph Business Discovery is on."
              : " Optional: INSTAGRAM_GRAPH_TOKEN + INSTAGRAM_BUSINESS_ID for live IG follower/post stats."}
          </p>
          <p className="text-xs text-zinc-500">
            Untick biggest names to keep the micro/mid shortlist. Search still finds them when the box is on.
            Load unpacked <code>extension/</code> in Opera (opera://extensions) and open a TikTok profile for the live score card.
          </p>
          <label className="block text-sm">
            Mode
            <select
              className={SELECT_CLASS}
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
            >
              <option value="auto">Auto (live if key, else labelled sample)</option>
              <option value="sample">Sample only (labelled fictional)</option>
              <option value="live">Live YouTube API</option>
            </select>
          </label>
          {(mode === "live" || mode === "auto") && (
            <label className="block text-sm">
              YouTube API key
              <input
                type="password"
                autoComplete="off"
                className={SELECT_CLASS}
                value={youtubeKey}
                placeholder={serverHasKey ? "Server key is set — optional override" : "Paste key for live search"}
                onChange={(e) => setYoutubeKey(e.target.value)}
              />
              <span className="block mt-1 text-xs text-zinc-500">
                {serverHasKey
                  ? "A key is already set on the server."
                  : "Google Cloud → enable YouTube Data API v3 → create an API key. Or add YOUTUBE_API_KEY to .env.local and restart npm run dev."}
              </span>
            </label>
          )}
          <button
            type="button"
            onClick={run}
            disabled={loading || markets.length === 0 || nicheIds.length === 0}
            className="w-full rounded-lg bg-emerald-500 text-black font-medium py-2.5 disabled:opacity-50"
          >
            {loading ? "Searching…" : "Run discovery"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </aside>

        <section className="space-y-5">
          {!result && (
            <div className="rounded-xl border border-zinc-800 p-8 text-zinc-400">
              <p className="text-lg text-zinc-200">Pick a niche and a country. Local terms. Ranked, explained, outreach-ready.</p>
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
              <p className="text-xs text-zinc-500">*4 minutes per creator vs manual scrolling.</p>
              {result.notes.map((n) => (
                <p key={n} className="text-xs text-amber-200/80">
                  {n}
                </p>
              ))}
              <div className="rounded-lg border border-zinc-800 p-3 text-sm">
                <p className="text-zinc-400 mb-2">Local search terms</p>
                <ul className="space-y-1">
                  {result.termsPerMarket.map((t) => (
                    <li key={t.country}>
                      <span className="text-emerald-400">{t.country}</span>{" "}
                      <span className="text-zinc-500">({t.source})</span> — {t.terms.join(", ")}
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
                <span className="text-sm text-zinc-500">Shortlist {shortlist.length}</span>
              </div>
              <div className="space-y-3">
                {visible.map((c) => {
                  const channel = channelUrl(c);
                  const content = latestContentUrl(c);
                  return (
                  <article key={c.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <h2 className="font-medium text-lg">
                          {channel ? (
                            <a href={channel} target="_blank" rel="noreferrer" className="hover:text-emerald-400">
                              {c.displayName}
                            </a>
                          ) : (
                            c.displayName
                          )}{" "}
                          <span className="text-emerald-400 text-sm">{c.fit} fit</span>
                          {c.hiddenGem && (
                            <span className="ml-2 text-xs bg-emerald-500 text-black px-2 py-0.5 rounded-full">
                              Hidden gem
                            </span>
                          )}
                        </h2>
                        <p className="text-xs text-zinc-500">
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
                            className="text-xs border border-zinc-600 rounded px-2 py-1 hover:border-emerald-500"
                          >
                            Channel
                          </a>
                        )}
                        {content && (
                          <a
                            href={content}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs rounded px-2 py-1 bg-emerald-600 text-black font-medium"
                          >
                            Content
                          </a>
                        )}
                        <button
                          type="button"
                          className="text-xs border border-zinc-600 rounded px-2"
                          onClick={() => addToShortlist(c)}
                        >
                          Shortlist
                        </button>
                        <button
                          type="button"
                          className="text-xs border border-zinc-600 rounded px-2"
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
                          className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300"
                        >
                          {a.platform} · {a.source}
                        </a>
                      ))}
                    </div>
                    {c.recentContent.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-zinc-400">
                        {c.recentContent.slice(0, 3).map((p) => (
                          <li key={p.postId}>
                            {p.url ? (
                              <a href={p.url} target="_blank" rel="noreferrer" className="text-emerald-300 hover:underline">
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
                      <div className="mt-3 text-sm space-y-2 text-zinc-300">
                        <p>{c.reasons.join(" ")}</p>
                        {c.llmReasons.length > 0 && (
                          <p className="text-emerald-200/80">LLM: {c.llmReasons.join(" ")}</p>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                          {Object.entries(c.components).map(([k, v]) => (
                            <div key={k} className="bg-zinc-900 rounded p-2">
                              <div className="text-zinc-500">{k}</div>
                              <div>{v}</div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs">
                          Deal: {c.suggestedDeal} · {c.contactRoute}
                        </p>
                        <pre className="whitespace-pre-wrap text-xs bg-zinc-900 p-3 rounded-lg">{c.messageDraft}</pre>
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
    <div className="rounded-lg border border-zinc-800 px-3 py-2 min-w-[100px]">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-lg">{value}</div>
    </div>
  );
}
