import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Paths reachable without a session. Terms/Privacy must stay public (required by
// TikTok/Instagram app review); OAuth callbacks can't be gated or login breaks.
const PUBLIC_PREFIXES = ["/login", "/signup", "/terms", "/privacy", "/auth"];

function isPublicPath(pathname: string) {
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  if (pathname.startsWith("/api/connect/")) return true; // TikTok/Instagram OAuth start + callback
  return false;
}

export async function middleware(req: NextRequest) {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  // Only gate when the browser can also authenticate (public vars set). This
  // prevents a lockout if the app deploys before NEXT_PUBLIC_SUPABASE_URL is set.
  if (!url || !anon) return NextResponse.next();

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = req.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const home = req.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }

  return res;
}

export const config = {
  // Run on everything except Next internals and static asset files (incl. the
  // TikTok verification .txt files and favicons served from /public).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)"],
};
