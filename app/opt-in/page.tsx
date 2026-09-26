"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LegalNav, SiteFooter } from "@/components/Legal";

type Saved = {
  id: string;
  platform: "tiktok" | "instagram";
  handle: string;
  displayName: string;
  followers: number | null;
  consentedAt: string;
  via: string;
};

function OptInInner() {
  const params = useSearchParams();
  const intent = (params.get("intent") === "instagram" ? "instagram" : "tiktok") as "tiktok" | "instagram";
  const reason = params.get("reason");
  const connected = params.get("connected");
  const [platform, setPlatform] = useState<"tiktok" | "instagram">(intent);
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [tiktokOAuth, setTiktokOAuth] = useState(false);
  const [igOAuth, setIgOAuth] = useState(false);

  useEffect(() => {
    setPlatform(intent);
  }, [intent]);

  useEffect(() => {
    fetch("/api/opt-in")
      .then((r) => r.json())
      .then((d: { creators?: Saved[] }) => setSaved(d.creators ?? []))
      .catch(() => {});
    fetch("/api/status")
      .then((r) => r.json())
      .then((d: { tiktokOAuth?: boolean; instagramOAuth?: boolean }) => {
        setTiktokOAuth(Boolean(d.tiktokOAuth));
        setIgOAuth(Boolean(d.instagramOAuth));
      })
      .catch(() => {});
  }, [connected]);

  const banner = useMemo(() => {
    if (connected) return `${connected === "tiktok" ? "TikTok" : "Instagram"} connected. We only store the public profile you authorized.`;
    if (reason === "no_app") {
      return "Official login needs a TikTok Login Kit / Meta Instagram app. Share your public username below so we can store a consented opt-in without scraping.";
    }
    if (reason === "oauth_state" || reason === "token") {
      return "Login was cancelled or the app credentials/redirect URI do not match. You can still opt in with your public username.";
    }
    if (reason) return `Login did not finish (${reason}). You can still opt in with your public username.`;
    return null;
  }, [connected, reason]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, handle, displayName, consent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      setSaved((s) => [data.creator, ...s.filter((x) => x.id !== data.creator.id)]);
      setHandle("");
      setDisplayName("");
      setConsent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-emerald-900/40 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <a href="/" className="text-sm text-emerald-400">
          ← Creator Scout
        </a>
        <LegalNav />
      </header>
      <div className="flex-1 max-w-xl mx-auto px-6 py-16 space-y-4 w-full">
      <h1 className="text-2xl font-semibold">Work with Prenew</h1>
      <p className="text-zinc-400 text-sm">
        Connect TikTok or Instagram with official login (Login Kit / Instagram Login), or share a public
        username. We only store what you consent to. No scraping, no auto-DMs.
      </p>
      {banner && <p className="text-sm text-amber-200/90">{banner}</p>}
      <div className="rounded-xl border border-zinc-800 p-6 space-y-3">
        <a
          href="/api/connect/tiktok"
          className="block w-full text-center rounded-lg py-2.5 bg-emerald-500 text-black font-medium"
        >
          Connect TikTok
        </a>
        <a
          href="/api/connect/instagram"
          className="block w-full text-center rounded-lg py-2.5 border border-zinc-500 hover:border-emerald-400"
        >
          Connect Instagram
        </a>
        <p className="text-xs text-zinc-500">
          {tiktokOAuth
            ? "TikTok Login Kit is configured — Connect TikTok opens TikTok’s official login."
            : "TikTok app not set (TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET). Connect TikTok still works: you’ll land on the public-handle form."}{" "}
          {igOAuth
            ? "Instagram Login is configured."
            : "Instagram app not set (INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET). Connect Instagram uses the same form."}
        </p>
        <form onSubmit={submit} className="space-y-3 pt-2 border-t border-zinc-800">
          <p className="text-sm text-zinc-300">Public username (consented opt-in)</p>
          <div className="flex gap-2 text-sm">
            <label className="flex gap-1 items-center">
              <input type="radio" name="platform" checked={platform === "tiktok"} onChange={() => setPlatform("tiktok")} />
              TikTok
            </label>
            <label className="flex gap-1 items-center">
              <input
                type="radio"
                name="platform"
                checked={platform === "instagram"}
                onChange={() => setPlatform("instagram")}
              />
              Instagram
            </label>
          </div>
          <input
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm"
            placeholder={platform === "tiktok" ? "@handle" : "username"}
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            required
          />
          <input
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm"
            placeholder="Display name (optional)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <label className="flex gap-2 text-xs text-zinc-400">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              I opt in to share this public profile with Prenew Creator Scout, agree to the{" "}
              <a className="text-emerald-400" href="/terms">
                Terms
              </a>{" "}
              and{" "}
              <a className="text-emerald-400" href="/privacy">
                Privacy Policy
              </a>
              , and can ask for deletion anytime.
            </span>
          </label>
          <button
            type="submit"
            disabled={saving || !consent}
            className="w-full rounded-lg bg-zinc-100 text-black py-2 text-sm disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save opt-in"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
        <p className="text-xs text-zinc-500">
          We never collect private phone numbers or home addresses. You can ask us to delete your record
          anytime.
        </p>
      </div>
      {saved.length > 0 && (
        <ul className="space-y-2 text-sm">
          {saved.map((c) => (
            <li key={c.id} className="border border-zinc-800 rounded-lg px-3 py-2">
              {c.displayName} · {c.platform} {c.handle} · {c.via}
            </li>
          ))}
        </ul>
      )}
      </div>
      <SiteFooter />
    </div>
  );
}

export default function OptInPage() {
  return (
    <Suspense fallback={<p className="p-8 text-zinc-400">Loading…</p>}>
      <OptInInner />
    </Suspense>
  );
}
