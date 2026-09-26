"use client";

import { useState } from "react";
import { LegalNav, SiteFooter } from "@/components/Legal";

type ScoreResult = {
  name?: string;
  fit?: number;
  hiddenGem?: boolean;
  tier?: string;
  followers?: number;
  reasons?: string[];
  suggestedDeal?: string;
  flags?: string[];
  components?: Record<string, number>;
  coverage?: string;
};

export default function LensPage() {
  const [name, setName] = useState("SetupKid");
  const [bio, setBio] = useState("Budget PC builds, used GPUs, student setups. tiktok.com/@setupkid");
  const [captions, setCaptions] = useState("Refurbished 4070 build under €700\nIs a used GPU worth it in 2026?");
  const [followers, setFollowers] = useState("22000");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function score() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/score-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          platform: "tiktok",
          bio,
          captions: captions.split("\n").filter(Boolean),
          followers: Number(followers),
          likes: 900,
          comments: 80,
          views: 12000,
          country: "FI",
          market: "FI",
        }),
      });
      const data = (await res.json()) as ScoreResult;
      if (!res.ok) throw new Error("Could not score this profile");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not score this profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-border px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <a href="/app" className="text-sm text-accent-text">
          ← Creator Scout
        </a>
        <LegalNav />
      </header>
      <div className="flex-1 max-w-2xl mx-auto px-6 py-10 space-y-6 w-full">
        <div>
          <h1 className="text-2xl font-semibold">Scout Lens</h1>
          <p className="mt-2 text-sm text-muted">
            The real Scout Lens is a browser extension. You open one TikTok or Instagram profile in
            your own logged-in browser; it reads what is already on screen (name, bio, follower
            count, captions on visible posts) and scores that creator with the same fit logic as
            discovery. One profile at a time. It does not crawl, log in for you, or send messages.
          </p>
          <p className="mt-2 text-xs text-muted">
            Opera GX: <code>opera://extensions</code> → Developer mode → Load unpacked →{" "}
            <code>extension/</code> folder in this repo. Then open any{" "}
            <code>tiktok.com/@…</code> profile. A score card appears on the page.
          </p>
        </div>

        <div className="rounded-xl border border-border p-5 space-y-4">
          <div>
            <h2 className="text-sm font-medium">Try the scorer here</h2>
            <p className="text-xs text-muted mt-1">
              Same API as the extension. Paste what you would see on a profile if you cannot install
              the extension in front of judges.
            </p>
          </div>

          <label className="block text-sm">
            <span className="font-medium">Display name</span>
            <span className="block text-xs text-muted mt-0.5">The name shown at the top of the profile.</span>
            <input
              className="mt-1.5 w-full field p-2.5 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium">Bio</span>
            <span className="block text-xs text-muted mt-0.5">
              The about text under the name. Used for niche match and brand-risk flags.
            </span>
            <textarea
              className="mt-1.5 w-full field p-2.5 text-sm min-h-[72px]"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium">Recent post captions</span>
            <span className="block text-xs text-muted mt-0.5">
              One caption per line — the last few videos/posts you can see on the profile.
            </span>
            <textarea
              className="mt-1.5 w-full field p-2.5 text-sm min-h-[88px]"
              value={captions}
              onChange={(e) => setCaptions(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium">Followers</span>
            <span className="block text-xs text-muted mt-0.5">
              Public follower count. Sets size tier (nano / micro / mid / macro) and hidden-gem rules.
            </span>
            <input
              className="mt-1.5 w-full field p-2.5 text-sm"
              inputMode="numeric"
              value={followers}
              onChange={(e) => setFollowers(e.target.value)}
            />
          </label>

          <button type="button" onClick={score} className="btn-primary px-4 py-2 text-sm font-medium">
            {loading ? "Scoring…" : "Score this profile"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        {result && (
          <div className="rounded-xl border border-border p-5 space-y-3">
            <p className="text-lg font-semibold">
              {result.name ?? name} · {result.fit ?? "—"} fit
              {result.hiddenGem ? " · hidden gem" : ""}
            </p>
            <p className="text-xs text-muted">
              {result.tier} · {(result.followers ?? Number(followers)).toLocaleString()} followers
            </p>
            {result.reasons && result.reasons.length > 0 && (
              <p className="text-sm">{result.reasons.join(" ")}</p>
            )}
            {result.components && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {Object.entries(result.components).map(([k, v]) => (
                  <div key={k} className="card-sm p-2">
                    <div className="text-muted">{k}</div>
                    <div className="font-medium">{v}</div>
                  </div>
                ))}
              </div>
            )}
            {result.flags && result.flags.length > 0 && (
              <p className="text-xs text-red-400">{result.flags.join(" · ")}</p>
            )}
            {result.suggestedDeal && <p className="text-xs text-muted">Deal: {result.suggestedDeal}</p>}
            {result.coverage && <p className="text-xs text-muted">{result.coverage}</p>}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
