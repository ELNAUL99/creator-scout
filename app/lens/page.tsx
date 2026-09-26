"use client";

import { useState } from "react";
import { LegalNav, SiteFooter } from "@/components/Legal";

export default function LensPage() {
  const [bio, setBio] = useState("Budget PC builds, used GPUs, student setups. tiktok.com/@setupkid");
  const [captions, setCaptions] = useState("Refurbished 4070 build under €700\nIs a used GPU worth it in 2026?");
  const [followers, setFollowers] = useState("22000");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  async function score() {
    setLoading(true);
    const res = await fetch("/api/score-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "SetupKid",
        platform: "instagram",
        bio,
        captions: captions.split("\n").filter(Boolean),
        followers: Number(followers),
        likes: 900,
        comments: 80,
        views: 12000,
        country: "DE",
        market: "DE",
      }),
    });
    setResult(await res.json());
    setLoading(false);
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-emerald-900/40 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <a href="/" className="text-sm text-emerald-400">
          ← Creator Scout
        </a>
        <LegalNav />
      </header>
      <div className="flex-1 max-w-2xl mx-auto px-6 py-10 space-y-4 w-full">
      <h1 className="text-2xl font-semibold">Scout Lens</h1>
      <p className="text-sm text-zinc-400">
        Open a TikTok or Instagram profile in your own logged-in browser. Scout Lens reads what is
        already on screen and scores it with the same logic as discovery. One profile at a time, human
        pace — not bulk scraping, no login or captcha bypass.
      </p>
      <p className="text-xs text-amber-200/80">
        Load unpacked from <code>extension/</code> in Opera GX (or any Chromium browser: opera://extensions → Developer mode). This page is the clickable
        mock if judges can&apos;t install the extension.
      </p>
      <textarea className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-sm" value={bio} onChange={(e) => setBio(e.target.value)} />
      <textarea className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-sm min-h-[80px]" value={captions} onChange={(e) => setCaptions(e.target.value)} />
      <input className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-sm" value={followers} onChange={(e) => setFollowers(e.target.value)} />
      <button type="button" onClick={score} className="bg-emerald-500 text-black rounded-lg px-4 py-2">
        {loading ? "Scoring…" : "Score this profile"}
      </button>
      {result && (
        <pre className="text-xs bg-zinc-950 border border-zinc-800 rounded-lg p-4 overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
      </div>
      <SiteFooter />
    </div>
  );
}
