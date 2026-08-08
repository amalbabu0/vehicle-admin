import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Reached via the "forgot password" email link (?next=/reset-password)
// and the admin-login OTP email's "Sign in" link (?next=/) — this app has
// no self-service registration and no Google sign-in, so there's no other
// flow that lands here. Both callers pass an explicit `next`; the
// fallback below only matters for a malformed/missing-param request.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=link_failed`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
