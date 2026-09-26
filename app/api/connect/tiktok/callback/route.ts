import { NextResponse } from "next/server";
import { appBaseUrl, readOauthCookie } from "@/lib/oauth";
import { upsertOptIn } from "@/lib/optInStore";

export async function GET(req: Request) {
  const base = appBaseUrl(req);
  const incoming = new URL(req.url);
  const err = incoming.searchParams.get("error");
  if (err) return NextResponse.redirect(`${base}/opt-in?intent=tiktok&reason=${encodeURIComponent(err)}`);
  const code = incoming.searchParams.get("code");
  const state = incoming.searchParams.get("state") ?? "";
  const expected = await readOauthCookie("tt_oauth_state");
  const verifier = await readOauthCookie("tt_code_verifier");
  if (!code || !state || state !== expected) {
    return NextResponse.redirect(`${base}/opt-in?intent=tiktok&reason=oauth_state`);
  }
  const redirectUri = process.env.TIKTOK_REDIRECT_URI?.trim() || `${base}/api/connect/tiktok/callback`;
  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: (process.env.TIKTOK_CLIENT_KEY ?? "").trim(),
      client_secret: (process.env.TIKTOK_CLIENT_SECRET ?? "").trim(),
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });
  const token = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!token.access_token) {
    return NextResponse.redirect(`${base}/opt-in?intent=tiktok&reason=token`);
  }
  const fields = "open_id,display_name,username,bio_description,follower_count";
  const me = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${fields}`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const body = (await me.json()) as {
    data?: {
      user?: {
        open_id?: string;
        display_name?: string;
        username?: string;
        bio_description?: string;
        follower_count?: number;
      };
    };
  };
  const user = body.data?.user;
  const handle = user?.username || user?.open_id || "tiktok";
  await upsertOptIn({
    platform: "tiktok",
    handle,
    displayName: user?.display_name || handle,
    followers: user?.follower_count ?? null,
    bio: user?.bio_description ?? "",
    via: "oauth",
  });
  return NextResponse.redirect(`${base}/opt-in?connected=tiktok`);
}
