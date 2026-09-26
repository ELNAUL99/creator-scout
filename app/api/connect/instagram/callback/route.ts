import { NextResponse } from "next/server";
import { appBaseUrl, readOauthCookie } from "@/lib/oauth";
import { upsertOptIn } from "@/lib/optInStore";

export async function GET(req: Request) {
  const base = appBaseUrl(req);
  const incoming = new URL(req.url);
  const err = incoming.searchParams.get("error");
  if (err) return NextResponse.redirect(`${base}/opt-in?intent=instagram&reason=${encodeURIComponent(err)}`);
  const code = incoming.searchParams.get("code");
  const state = incoming.searchParams.get("state") ?? "";
  const expected = await readOauthCookie("ig_oauth_state");
  if (!code) {
    return NextResponse.redirect(`${base}/opt-in?intent=instagram&reason=oauth_state`);
  }
  if (expected && state && state !== expected) {
    return NextResponse.redirect(`${base}/opt-in?intent=instagram&reason=oauth_state`);
  }
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI?.trim() || `${base}/api/connect/instagram/callback`;
  const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: (process.env.INSTAGRAM_APP_ID ?? "").trim(),
      client_secret: (process.env.INSTAGRAM_APP_SECRET ?? "").trim(),
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });
  const token = (await tokenRes.json()) as {
    access_token?: string;
    user_id?: number | string;
    error_type?: string;
  };
  if (!token.access_token) {
    return NextResponse.redirect(`${base}/opt-in?intent=instagram&reason=token`);
  }
  const me = await fetch(
    `https://graph.instagram.com/me?fields=id,username,name,account_type,media_count&access_token=${encodeURIComponent(token.access_token)}`,
  );
  const user = (await me.json()) as { id?: string; username?: string; name?: string };
  const handle = user.username || String(token.user_id || "instagram");
  await upsertOptIn({
    platform: "instagram",
    handle,
    displayName: user.name || handle,
    followers: null,
    bio: "",
    via: "oauth",
  });
  return NextResponse.redirect(`${base}/opt-in?connected=instagram`);
}
