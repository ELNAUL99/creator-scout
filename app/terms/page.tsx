import { LegalShell } from "@/components/Legal";

export const metadata = {
  title: "Terms of Service · Creator Scout",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service">
      <p>
        These Terms govern your use of Prenew Creator Scout (the “Service”), a marketer tool for
        discovering and scoring public creator profiles and drafting outreach. By using the Service
        you agree to them. They are written for this product; they are not legal advice.
      </p>

      <h2 className="text-base font-medium text-zinc-100 pt-2">1. What the Service is</h2>
      <p>
        Creator Scout helps Prenew and other marketers find micro- and mid-tier creators on YouTube,
        TikTok, and Instagram, explain a fit score, and draft a first message. It is a demo. The
        Service never sends messages to creators. A human must copy, edit, disclose, and send any
        outreach.
      </p>

      <h2 className="text-base font-medium text-zinc-100 pt-2">2. Who may use it</h2>
      <p>
        You must be 18 or older and use the Service for legitimate marketing or product evaluation.
        You may not use it to harass creators, buy fake engagement, impersonate others, bypass
        platform logins or captchas, run fake accounts, rotate proxies to evade limits, or scrape
        TikTok or Instagram.
      </p>

      <h2 className="text-base font-medium text-zinc-100 pt-2">3. Your keys and platform rules</h2>
      <p>
        API keys and tokens you add (YouTube, Google or Brave Search, Meta/Instagram, TikTok Login
        Kit, optional OpenAI) remain yours. You must follow each provider’s terms. If a provider
        blocks a method (for example YouTube <code>search.list</code>), the Service may fall back to
        labelled sample data instead of inventing live stats.
      </p>

      <h2 className="text-base font-medium text-zinc-100 pt-2">4. How we get creator data</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>YouTube: official YouTube Data API v3.</li>
        <li>
          TikTok and Instagram handles: search-engine <code>site:</code> queries of public pages, or
          a licensed data API in production — not scraping those platforms’ search.
        </li>
        <li>Instagram metrics: Graph API Business Discovery when you connect a Meta app.</li>
        <li>
          Scout Lens: scores one profile you already have open in your own browser session, at human
          pace.
        </li>
        <li>
          Opt-in: a creator may connect with official TikTok or Instagram login, or share a public
          username with consent.
        </li>
      </ul>
      <p>
        Production may swap search-engine discovery for a licensed creator-data API. Scoring, Scout
        Lens, opt-in, and Instagram Business Discovery stay.
      </p>

      <h2 className="text-base font-medium text-zinc-100 pt-2">5. Sample and scores</h2>
      <p>
        Rows marked sample are fictional and must not be presented as real creators. Fit scores are
        estimates for internal shortlisting, not a guarantee of campaign results, audience quality,
        or a creator’s willingness to work with Prenew.
      </p>

      <h2 className="text-base font-medium text-zinc-100 pt-2">6. Brand and children</h2>
      <p>
        Prenew sells refurbished gaming PCs to adults. You must not use the Service to recruit
        child-directed channels or to market to children. The Service may flag kids, gambling, or
        competitor content; flags are aids, not legal clearance.
      </p>

      <h2 className="text-base font-medium text-zinc-100 pt-2">7. No warranty</h2>
      <p>
        The Service is provided “as is.” Prenew is not liable for platform bans, API quota, lost
        deals, or how you use exported CSV/Sheets data. To the extent allowed by law, liability is
        limited to zero for this free demo.
      </p>

      <h2 className="text-base font-medium text-zinc-100 pt-2">8. Changes</h2>
      <p>
        We may update these Terms by posting a new version at this URL. Continued use after the
        update date means you accept the new Terms. Governing law: Finland, unless your mandatory
        local consumer law says otherwise.
      </p>
    </LegalShell>
  );
}
