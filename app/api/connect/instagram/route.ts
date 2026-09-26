import { NextResponse } from "next/server";
import { appBaseUrl, instagramOAuthConfigured, randomState, setOauthCookie } from "@/lib/oauth";

export async function GET() {
  const base = appBaseUrl();
  if (!instagramOAuthConfigured()) {
    return NextResponse.redirect(`${base}/opt-in?intent=instagram&reason=no_app`);
  }
  const state = randomState();
  await setOauthCookie("ig_oauth_state", state);
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI?.trim() || `${base}/api/connect/instagram/callback`;
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", process.env.INSTAGRAM_APP_ID!.trim());
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "instagram_business_basic");
  url.searchParams.set("state", state);
  return NextResponse.redirect(url.toString());
}
