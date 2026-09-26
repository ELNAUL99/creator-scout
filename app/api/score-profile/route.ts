import { NextResponse } from "next/server";
import { mergeBrand } from "@/lib/brand";
import { loadActiveBrand, saveActiveBrand } from "@/lib/brandStore";
import { saveLensCapture } from "@/lib/lensStore";
import { scoreVisibleProfile } from "@/lib/scoreProfile";
import type { BrandProfile, Platform } from "@/lib/types";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    name?: string;
    platform?: Platform;
    bio?: string;
    captions?: string[];
    followers?: number;
    likes?: number;
    comments?: number;
    views?: number;
    country?: string;
    market?: string;
    url?: string;
    handle?: string;
    briefTerms?: string[];
    brand?: Partial<BrandProfile>;
  };
  const platform: Platform =
    body.platform === "tiktok" ||
    body.platform === "youtube" ||
    body.platform === "facebook" ||
    body.platform === "twitch"
      ? body.platform
      : "instagram";
  const handle = (body.handle ?? body.name ?? "creator").replace(/^@/, "");
  const brandPartial = body.brand ?? (await loadActiveBrand()) ?? undefined;
  const brand = mergeBrand(brandPartial);
  if (body.brand) await saveActiveBrand(brand);
  const creator = scoreVisibleProfile({
    name: body.name ?? handle,
    platform,
    bio: body.bio ?? "",
    captions: body.captions ?? [],
    followers: body.followers ?? 0,
    likes: body.likes ?? 0,
    comments: body.comments ?? 0,
    views: body.views ?? 1,
    country: body.country ?? null,
    market: body.market ?? "FI",
    briefTerms: body.briefTerms?.length ? body.briefTerms : brand.goodFitWords.slice(0, 8),
    source: "extension",
    url: body.url ?? "",
    handle: platform === "tiktok" ? `@${handle}` : handle,
    brand,
  });
  await saveLensCapture({
    name: creator.displayName,
    platform,
    bio: body.bio ?? "",
    captions: body.captions ?? [],
    followers: body.followers ?? 0,
    likes: body.likes ?? 0,
    comments: body.comments ?? 0,
    views: body.views ?? 1,
    country: body.country ?? null,
    url: body.url ?? "",
    handle: platform === "tiktok" ? `@${handle}` : handle,
  });
  return NextResponse.json(
    {
      name: creator.displayName,
      platform,
      fit: creator.fit,
      components: creator.components,
      flags: creator.flags,
      hiddenGem: creator.hiddenGem,
      reasons: creator.reasons,
      suggestedDeal: creator.suggestedDeal,
      messageDraft: creator.messageDraft,
      followers: creator.followers,
      tier: creator.tier,
      source: "extension",
      coverage: `Scout Lens scored this profile for ${brand.name}. One at a time, your session. It does not crawl.`,
    },
    { headers: CORS },
  );
}
