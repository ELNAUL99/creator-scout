import { NextResponse } from "next/server";

/** Anon URL + key are safe to expose; the browser needs them when NEXT_PUBLIC_* was not inlined at build. */
export async function GET() {
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Supabase is not configured on this server." }, { status: 503 });
  }
  return NextResponse.json({ url, anonKey });
}
