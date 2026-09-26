import { LegalShell } from "@/components/Legal";

export const metadata = {
  title: "Privacy Policy · Creator Scout",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <p>
        This policy explains how Prenew Creator Scout (“we”) handles information. It is written for
        this product. For this hackathon demo, processing usually happens on the machine running the
        app (localhost).
      </p>

      <h2 className="text-base font-medium text-zinc-100 pt-2">1. Who is responsible</h2>
      <p>
        Prenew operates Creator Scout. To ask for access or deletion of an opt-in record, contact
        the Prenew team running this demo.
      </p>

      <h2 className="text-base font-medium text-zinc-100 pt-2">2. What we process</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border border-zinc-800">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="p-2">Source</th>
              <th className="p-2">Data</th>
              <th className="p-2">Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-zinc-800">
              <td className="p-2">You (marketer)</td>
              <td className="p-2">Niche and country filters, optional API key in the form, shortlists you export</td>
              <td className="p-2">Run discovery and scoring</td>
            </tr>
            <tr className="border-t border-zinc-800">
              <td className="p-2">YouTube Data API</td>
              <td className="p-2">Public channel and video metadata</td>
              <td className="p-2">Find and score YouTube creators</td>
            </tr>
            <tr className="border-t border-zinc-800">
              <td className="p-2">Google CSE or Brave Search</td>
              <td className="p-2">Public indexed URLs and snippets</td>
              <td className="p-2">Find public TikTok/Instagram handles without scraping those platforms</td>
            </tr>
            <tr className="border-t border-zinc-800">
              <td className="p-2">Instagram Graph</td>
              <td className="p-2">Public business/creator stats your Meta app is allowed to query</td>
              <td className="p-2">Follower and post metrics</td>
            </tr>
            <tr className="border-t border-zinc-800">
              <td className="p-2">Official login (if configured)</td>
              <td className="p-2">Profile fields the creator authorizes</td>
              <td className="p-2">Creator opt-in</td>
            </tr>
            <tr className="border-t border-zinc-800">
              <td className="p-2">Opt-in form</td>
              <td className="p-2">Public username, display name, consent time</td>
              <td className="p-2">Store a consented record</td>
            </tr>
            <tr className="border-t border-zinc-800">
              <td className="p-2">Scout Lens</td>
              <td className="p-2">Visible name, bio, follower/like counts, captions on the tab you opened</td>
              <td className="p-2">Score that one profile</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        We do not intend to collect private phone numbers, home addresses, payment cards, or precise
        GPS location.
      </p>

      <h2 className="text-base font-medium text-zinc-100 pt-2">3. Why we process it (EU/EEA)</h2>
      <p>
        Legitimate interest: public professional content for B2B creator discovery. Consent: opt-in
        and Scout Lens sending on-screen data to the local app. Your own API keys: so the Service
        can call APIs you chose.
      </p>

      <h2 className="text-base font-medium text-zinc-100 pt-2">4. Storage and sharing</h2>
      <p>
        Opt-in records may be stored locally (for example <code>data/opt-ins.json</code>). Keys live
        in your environment or browser. CSV/Sheets exports are files you create. We do not sell
        personal data. We share data with Google, Meta, TikTok, Brave, or OpenAI only when you use a
        feature that calls them. We do not send outreach on your behalf.
      </p>

      <h2 className="text-base font-medium text-zinc-100 pt-2">5. Scout Lens</h2>
      <p>
        The extension runs on TikTok and Instagram profile URLs you visit. It posts visible page
        text to <code>http://localhost:3000</code> on your machine. It does not crawl other profiles
        in the background.
      </p>

      <h2 className="text-base font-medium text-zinc-100 pt-2">6. Retention and rights</h2>
      <p>
        Demo data lasts until you delete local files or stop the app. Opt-in lasts until you or the
        creator ask for deletion. You and opted-in creators may request access, correction, or
        deletion, and may withdraw opt-in consent at any time.
      </p>

      <h2 className="text-base font-medium text-zinc-100 pt-2">7. Children and transfers</h2>
      <p>
        The Service is not directed at children. If you use US-based APIs, some data may leave the
        EEA under those providers’ terms.
      </p>

      <h2 className="text-base font-medium text-zinc-100 pt-2">8. Changes</h2>
      <p>
        If Creator Scout moves to a hosted backend or a licensed data API, we will update this page.
        The current version is always at <a className="text-emerald-400" href="/privacy">/privacy</a>.
      </p>
    </LegalShell>
  );
}
