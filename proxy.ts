import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renamed Middleware to Proxy (same runtime, same file
// conventions) — this still runs on every matched request. It ONLY
// refreshes the Supabase session cookie and does an *optimistic* redirect
// for signed-out users. Real authorization (role checks, RLS) happens in
// the Data Access Layer close to the data — see lib/auth/dal.ts and
// Supabase RLS policies. Never treat this file as the security boundary.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Touching getUser() is what actually refreshes the session cookie.
  // Route-protection redirects are added in the Authentication/RBAC tasks,
  // once /login and /dashboard exist — added prematurely here they'd 404.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
