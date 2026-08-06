import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renamed Middleware to Proxy (same runtime, same file
// conventions) — this still runs on every matched request. It refreshes
// the Supabase session cookie and does an *optimistic* redirect based only
// on whether a session exists. It deliberately does NOT check role — that
// requires a DB read (profiles.role), and Proxy runs on every request
// including prefetches, so it must stay cheap and cookie-only. Real
// authorization (role checks) happens in the Data Access Layer close to
// the data — see lib/auth/dal.ts — backed by RLS. Never treat this file as
// the security boundary; it's a UX redirect, not enforcement.
const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/unauthorized",
  "/auth/callback",
];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isPublicPath && path !== "/auth/callback") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/public-config|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
