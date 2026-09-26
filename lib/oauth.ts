import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";

export function appBaseUrl(req?: Request) {
  const configured = (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");
  if (configured) return configured;
  if (req) {
    try {
      return new URL(req.url).origin;
    } catch {
      // fall through
    }
  }
  return "http://localhost:3000";
}

export function tiktokOAuthConfigured() {
  return Boolean((process.env.TIKTOK_CLIENT_KEY ?? "").trim() && (process.env.TIKTOK_CLIENT_SECRET ?? "").trim());
}

export function instagramOAuthConfigured() {
  return Boolean((process.env.INSTAGRAM_APP_ID ?? "").trim() && (process.env.INSTAGRAM_APP_SECRET ?? "").trim());
}

export function pkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export async function setOauthCookie(name: string, value: string, secure = true) {
  const jar = await cookies();
  jar.set(name, value, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600, secure });
}

export async function readOauthCookie(name: string) {
  const jar = await cookies();
  return jar.get(name)?.value ?? "";
}

export function randomState() {
  return randomBytes(16).toString("hex");
}
