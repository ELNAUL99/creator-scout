import { NextResponse } from "next/server";
import { instagramConfigured } from "@/lib/instagram";
import { instagramOAuthConfigured, tiktokOAuthConfigured } from "@/lib/oauth";
import { searchApiConfigured } from "@/lib/webSearch";

export async function GET() {
  return NextResponse.json({
    youtubeConfigured: Boolean((process.env.YOUTUBE_API_KEY ?? "").trim()),
    searchConfigured: searchApiConfigured(),
    instagramConfigured: instagramConfigured(),
    tiktokOAuth: tiktokOAuthConfigured(),
    instagramOAuth: instagramOAuthConfigured(),
    llmConfigured: Boolean((process.env.MISTRAL_API_KEY ?? process.env.OPENAI_API_KEY ?? "").trim()),
  });
}
