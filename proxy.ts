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

// Public paths an *authenticated* user is still allowed to sit on, instead
// of being bounced to "/" by the redirect at the bottom of this file.
// A password-recovery link necessarily creates a session before the person
// ever sees the reset form — /auth/callback calls exchangeCodeForSession()
// and only then redirects to /reset-password (see resetPasswordForEmail's
// redirectTo in app/actions/auth.ts). Bouncing a signed-in user off
// /reset-password therefore made the reset flow impossible to finish: the
// link landed on "/", which dispatches by role via the DAL, so the form
// never rendered. /auth/callback was already exempt for the same reason;
// the destination it hands off to needs the exemption too.
const AUTHENTICATED_ALLOWED_PATHS = ["/auth/callback", "/reset-password"];

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

  if (user && !isPublicPath) {
    const { data: profile, error } = await supabase
      .from("admin_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", path);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (user && isPublicPath && !AUTHENTICATED_ALLOWED_PATHS.includes(path)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/public-config|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
