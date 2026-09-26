import { NextResponse } from "next/server";
import {
  appBaseUrl,
  pkcePair,
  randomState,
  setOauthCookie,
  tiktokOAuthConfigured,
} from "@/lib/oauth";

export async function GET() {
  const base = appBaseUrl();
  if (!tiktokOAuthConfigured()) {
    return NextResponse.redirect(`${base}/opt-in?intent=tiktok&reason=no_app`);
  }
  const state = randomState();
  const { verifier, challenge } = pkcePair();
  await setOauthCookie("tt_oauth_state", state);
  await setOauthCookie("tt_code_verifier", verifier);
  const redirectUri = process.env.TIKTOK_REDIRECT_URI?.trim() || `${base}/api/connect/tiktok/callback`;
  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", process.env.TIKTOK_CLIENT_KEY!.trim());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "user.info.basic");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return NextResponse.redirect(url.toString());
}
