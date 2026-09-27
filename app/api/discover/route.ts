import { NextResponse } from "next/server";
import { NICHE_TERMS, isNicheId } from "@/lib/niches";
import { runDiscover } from "@/lib/pipeline";
import type { DiscoverRequest } from "@/lib/types";

// Deep discovery paginates YouTube + fans out channel/video stats, so allow a
// longer serverless window than the default.
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as DiscoverRequest;
    const nicheIds = (body.nicheIds ?? []).filter(isNicheId);
    if (!nicheIds.length) {
      return NextResponse.json({ error: "niche is required" }, { status: 400 });
    }
    const pitch = (body.brand?.pitch ?? "").trim();
    const brief =
      (body.brief ?? "").trim() ||
      [nicheIds.map((id) => NICHE_TERMS[id].label).join(", "), pitch].filter(Boolean).join(". ");
    const result = await runDiscover({
      brief,
      markets: body.markets ?? [],
      nicheIds,
      nicheId: body.nicheId,
      sizeMin: body.sizeMin ?? 0,
      sizeMax: body.sizeMax ?? 100_000_000,
      includeNano: body.includeNano ?? true,
      includeMacro: body.includeMacro ?? true,
      timeWindowDays: body.timeWindowDays ?? 90,
      platforms: body.platforms?.length
        ? body.platforms
        : ["youtube", "tiktok", "instagram", "facebook", "twitch"],
      brand: body.brand,
      mode: body.mode ?? "auto",
      youtubeApiKey: body.youtubeApiKey,
      webDiscover: body.webDiscover !== false,
      includePrenewCollabs: Boolean(body.includePrenewCollabs),
      includePresetCatalog: Boolean(body.includePresetCatalog),
      localOnly: body.localOnly !== false,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Discover failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
