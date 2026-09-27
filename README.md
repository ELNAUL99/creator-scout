# Creator Scout

Worldwide influencer discovery for **micro- and mid-tier** creators. Built for the Prenew hackathon: niche + markets → local-language search → explainable fit scores → outreach drafts. Nothing is sent to creators automatically.

## Honest coverage

YouTube is live through the official Data API v3. TikTok and Instagram have no open commercial search. This demo uses only routes that do not put accounts at risk (no fake logins, rotating proxies, or captcha bypass):

1. **Search-engine discovery** — queries like `site:tiktok.com "pelikone"` via Google CSE or Brave Search. Public indexed profiles only; we never scrape TikTok or Instagram search.
2. **Instagram Graph API Business Discovery** — when a professional IG account is connected.
3. YouTube channel descriptions (linked TikTok / Instagram handles).
4. **Connect** (`/opt-in`) — official TikTok or Instagram login adds **that** account only.
5. Production: swap step 1 for a licensed creator-data API. Scoring and Connect stay.

Tell judges plainly: **YouTube is live. TikTok/Instagram are Connect or labelled demo — not a crawl.**

## Run locally

```bash
cd creator-scout
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without keys, **Auto** mode returns **labelled sample** YouTube profiles (fictional — never presented as live data) plus notes for the TikTok/Instagram routes.

| Variable | Purpose |
| --- | --- |
| `YOUTUBE_API_KEY` | Live YouTube Data API v3 search |
| `GOOGLE_CSE_KEY` + `GOOGLE_CSE_CX` | Programmable Search `site:` handle discovery |
| `BRAVE_SEARCH_API_KEY` | Alternative search API (used if CSE is unset) |
| `INSTAGRAM_GRAPH_TOKEN` + `INSTAGRAM_BUSINESS_ID` | Business Discovery stats for public IG usernames |
| `OPENAI_API_KEY` | Local query translation + fit reasons on the top ~30 creators |
| `OPENAI_BASE_URL` | Optional compatible gateway |
| `OPENAI_MODEL` | Defaults to `gpt-4o-mini` |

## Demo flow

1. Pick a niche and a country, then run discovery. Keep the demo catalog unchecked for a live YouTube-only list.
2. Open a card → Why → follow-up. Follow-ups use the stored YouTube channel pull.
3. TikTok/Instagram: Connect the account you want scored. Nothing is sent to creators.

## Stack

Next.js (App Router) · serverless route handlers · YouTube Data API · Google CSE / Brave Search · Instagram Graph · optional OpenAI-compatible LLM · CSV / Sheets copy export
