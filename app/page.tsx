import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { SiteFooter } from "@/components/Legal";

export default function Landing() {
  return (
    <div className="min-h-full flex flex-col">
      {/* Nav */}
      <header className="mx-auto w-full max-w-6xl px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-foreground font-bold shadow-[var(--shadow-md)]">
            CS
          </span>
          <span className="font-semibold tracking-tight">Creator Scout</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="text-sm text-muted hover:text-foreground px-2">
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm rounded-full bg-foreground text-background px-4 py-2 font-medium hover:opacity-90 transition-opacity"
          >
            Sign up
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto w-full max-w-6xl px-6 pb-8">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] items-center py-10 lg:py-16">
          <div>
            <span className="badge badge-dot px-3 py-1 text-[11px]">ONBOARDING</span>
            <h1 className="mt-5 text-5xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
              Find the creators who move your brand.
            </h1>
            <p className="mt-5 text-lg text-muted max-w-xl">
              Creator Scout surfaces rising micro and mid-tier creators across YouTube and TikTok —
              even in small markets others miss — and scores each one for your niche, so you shortlist
              in hours, not weeks.
            </p>
            <p className="mt-3 text-base text-muted max-w-xl">
              Built to spot the next MrBeast or Valkyrae while they’re still small — not just the names
              every brand already bids on.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-primary px-6 py-3 font-semibold inline-flex items-center gap-2">
                Start scouting free <span aria-hidden>→</span>
              </Link>
              <Link href="/login" className="btn-ghost px-6 py-3 font-medium">
                I already have an account
              </Link>
            </div>
            <p className="mt-6 text-sm text-muted flex flex-wrap gap-x-5 gap-y-1">
              <span>Trusted for small-market discovery</span>
              <span className="text-accent-text">•</span>
              <span>No credit card</span>
              <span className="text-accent-text">•</span>
              <span>YouTube + TikTok</span>
            </p>
          </div>

          {/* Dashboard mockup */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Scouting workspace</p>
              <span className="badge px-2.5 py-0.5 text-[10px]">Live</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { v: "128", l: "New matches" },
                { v: "1.4M", l: "Avg reach" },
                { v: "63%", l: "Engagement" },
              ].map((s) => (
                <div key={s.l} className="card-sm px-3 py-3">
                  <div className="text-xl font-bold">{s.v}</div>
                  <div className="text-[11px] text-muted mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2.5">
              {[
                { n: "Maya Okafor", m: "1.2M · Lifestyle", s: 94 },
                { n: "Devin Cole", m: "860K · Tech", s: 91 },
              ].map((c) => (
                <div key={c.n} className="card-sm flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-full bg-accent-soft" />
                    <div>
                      <div className="text-sm font-medium">{c.n}</div>
                      <div className="text-[11px] text-muted">{c.m}</div>
                    </div>
                  </div>
                  <span className="badge px-2 py-0.5 text-xs font-semibold">{c.s}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <div className="card-sm px-3 py-2 text-right">
                <div className="text-[11px] text-muted">Match quality</div>
                <div className="text-lg font-bold text-accent-text">A+</div>
              </div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="grid gap-5 md:grid-cols-3 pb-16">
          {[
            {
              n: 1,
              t: "Define your niche",
              d: "Set niche, country and creator size. Creator Scout runs local-language search per market.",
            },
            {
              n: 2,
              t: "Review scored matches",
              d: "Each creator is ranked by reach, engagement and brand fit — with reasons and risk flags.",
            },
            {
              n: 3,
              t: "Reach out & track",
              d: "Export shortlists to CSV, or collect consented creator opt-ins via official login.",
            },
          ].map((step) => (
            <div key={step.n} className="card p-6">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent-text font-semibold">
                {step.n}
              </span>
              <h3 className="mt-4 font-semibold text-lg">{step.t}</h3>
              <p className="mt-2 text-sm text-muted">{step.d}</p>
            </div>
          ))}
        </div>
        {/* How we score */}
        <section className="pb-16">
          <div className="max-w-2xl">
            <span className="badge badge-dot px-3 py-1 text-[11px]">HOW WE SCORE</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">
              Every creator gets a 0–100 Fit score
            </h2>
            <p className="mt-3 text-muted">
              No vanity follower counts. We blend five weighted signals into one explainable score —
              with plain-language reasons and risk flags on every result.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                t: "Niche relevance",
                w: "30%",
                d: "How closely the bio and recent captions match your niche’s local-language search terms.",
              },
              {
                t: "Audience match",
                w: "25%",
                d: "The creator’s country vs your target market, and whether the content is in that market’s language.",
              },
              {
                t: "Engagement quality",
                w: "25%",
                d: "Real engagement (likes + comments ÷ views) against a benchmark for their size, plus comment depth. Penalizes view-to-follower mismatch.",
              },
              {
                t: "Brand fit",
                w: "10%",
                d: "Rewards on-brand topics; penalizes competitor mentions and brand-risk content.",
              },
              {
                t: "Recent activity",
                w: "10%",
                d: "How recently they last posted — fresher, active creators rank higher.",
              },
            ].map((c) => (
              <div key={c.t} className="card p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{c.t}</h3>
                  <span className="text-accent-text font-bold text-sm">{c.w}</span>
                </div>
                <p className="mt-2 text-sm text-muted">{c.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              {
                t: "Size-fair benchmarks",
                d: "Engagement is judged by tier — nano (<10k), micro (10–50k), mid (50–250k), macro (250k+) — so a 20k creator isn’t unfairly compared to a 2M one.",
              },
              {
                t: "Hidden gems",
                d: "Under 50k followers, a 70+ Fit score, and zero risk flags — the rising creators most tools overlook.",
              },
              {
                t: "Risk flags",
                d: "We surface competitor mentions, brand-risk content, kids’ audiences, and views far below follower count (a fake-audience signal).",
              },
            ].map((c) => (
              <div key={c.t} className="card-sm p-5">
                <h3 className="font-semibold">{c.t}</h3>
                <p className="mt-2 text-sm text-muted">{c.d}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
