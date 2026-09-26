"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LegalNav, SiteFooter } from "@/components/Legal";
import { BrandHomeLink } from "@/components/BrandHomeLink";
import ThemeToggle from "@/components/ThemeToggle";

type Saved = {
  id: string;
  platform: "tiktok" | "instagram";
  handle: string;
  displayName: string;
  followers: number | null;
  bio?: string;
  consentedAt: string;
  via: string;
};

function OptInInner() {
  const params = useSearchParams();
  const reason = params.get("reason");
  const connected = params.get("connected");
  const [saved, setSaved] = useState<Saved[]>([]);
  const [tiktokOAuth, setTiktokOAuth] = useState(false);
  const [igOAuth, setIgOAuth] = useState(false);

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

  const tiktokConnected = connected === "tiktok" || saved.some((s) => s.platform === "tiktok" && s.via === "oauth");
  const instagramConnected =
    connected === "instagram" || saved.some((s) => s.platform === "instagram" && s.via === "oauth");

  const banner = useMemo(() => {
    if (connected) {
      return `${connected === "tiktok" ? "TikTok" : "Instagram"} connected. That login only returns YOUR profile. It is not permission to crawl other accounts.`;
    }
    if (reason === "no_app") {
      return "Official login needs TikTok Login Kit / Meta Instagram app credentials in env.";
    }
    if (reason === "oauth_state" || reason === "token") {
      return "Login was cancelled or the app credentials/redirect URI do not match. Try Connect again.";
    }
    if (reason) return `Login did not finish (${reason}). Try Connect again.`;
    return null;
  }, [connected, reason]);

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-border px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <BrandHomeLink compact />
        <div className="flex items-center gap-3">
          <LegalNav />
          <ThemeToggle />
        </div>
      </header>
      <div className="flex-1 max-w-xl mx-auto px-6 py-16 space-y-4 w-full">
        <h1 className="text-2xl font-semibold">Connect your account</h1>
        <p className="text-muted text-sm">
          Connect TikTok or Instagram with official login. That only loads the account you sign in with. It cannot
          search those networks or pull other people’s profiles.
        </p>
        {banner && <p className="text-sm text-amber-500">{banner}</p>}
        <div className="card p-6 space-y-3">
          {tiktokConnected ? (
            <div
              aria-disabled="true"
              className="block w-full text-center rounded-lg py-2.5 bg-accent-soft text-accent-text font-medium cursor-not-allowed select-none"
            >
              TikTok connected ✓
            </div>
          ) : (
            <a
              href="/api/connect/tiktok"
              className="block w-full text-center rounded-lg py-2.5 bg-accent text-accent-foreground font-medium"
            >
              Connect TikTok
            </a>
          )}
          {instagramConnected ? (
            <div
              aria-disabled="true"
              className="block w-full text-center rounded-lg py-2.5 border border-border bg-accent-soft text-accent-text cursor-not-allowed select-none"
            >
              Instagram connected ✓
            </div>
          ) : (
            <a
              href="/api/connect/instagram"
              className="block w-full text-center rounded-lg py-2.5 border border-border-strong hover:border-accent"
            >
              Connect Instagram
            </a>
          )}
          <p className="text-xs text-muted">
            {tiktokOAuth
              ? "TikTok Login Kit is configured — Connect opens TikTok’s official login."
              : "TikTok app not set (TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET)."}{" "}
            {igOAuth
              ? "Instagram Login is configured."
              : "Instagram app not set (INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET)."}
          </p>
        </div>
        {saved.length > 0 && (
          <ul className="space-y-2 text-sm">
            {saved.filter((c) => c.via === "oauth").map((c) => (
              <li key={c.id} className="border border-border rounded-lg px-3 py-2 space-y-1">
                <div>
                  {c.displayName} · {c.platform}{" "}
                  <span className="text-accent-text">{c.handle}</span>
                  {c.followers != null ? ` · ${c.followers.toLocaleString()} followers` : ""}
                </div>
                {c.bio ? <p className="text-xs text-muted">{c.bio}</p> : null}
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
    <Suspense fallback={<p className="p-8 text-muted">Loading…</p>}>
      <OptInInner />
    </Suspense>
  );
}
