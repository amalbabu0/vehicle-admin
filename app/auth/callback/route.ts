import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles both magic-link/password-reset redirects and Google OAuth's code
// exchange. No role-assignment or auto-provisioning is allowed here; only
// existing entries in admin_profiles may access the admin portal.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  // Password-reset flow lands here with next=/reset-password — role checks
  // don't apply, the user isn't trying to access the dashboard yet.
  if (next === "/reset-password") {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "lister")) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=no_admin_access`);
  }

  if (profile.role === "admin") {
    const { data: setting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "admin_email")
      .single();

    const allowedEmail = typeof setting?.value === "string" ? setting.value : null;
    if (!allowedEmail || data.user.email?.toLowerCase() !== allowedEmail.toLowerCase()) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=no_admin_access`);
    }
  }

  await supabase.rpc("log_audit_event", {
    p_action: "login",
    p_entity_type: "auth",
    p_entity_id: data.user.id,
    p_metadata: { provider: "google" },
  });

  return NextResponse.redirect(`${origin}${next}`);
}
