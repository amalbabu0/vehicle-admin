// Deletes the calling User App account permanently. Needed as an Edge
// Function specifically because the user app's Next.js server holds no
// service-role key (deliberately — see vehicle-user/lib/env.ts's own
// comment on why: it's scoped to read-mostly access). auth.admin.deleteUser
// requires service-role privileges, which only exist here, in Supabase's
// own infrastructure — not reachable from the user app's server at all.
//
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are
// automatically injected into every Edge Function's environment by
// Supabase — no manual secret configuration needed for those three.
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("USER_APP_SITE_URL") ?? "https://www.keralaleasehub.online";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return Response.json({ message: "Method not allowed." }, { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return Response.json({ message: "Your session has expired. Please sign in again." }, { status: 401, headers: corsHeaders });
  }

  const body = (await req.json().catch(() => null)) as { confirmation?: unknown; currentPassword?: unknown } | null;
  if (body?.confirmation !== "DELETE" || typeof body.currentPassword !== "string" || !body.currentPassword) {
    return Response.json({ message: "Type DELETE and enter your current password to continue." }, { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Bound to the caller's own JWT (from the Authorization header) — every
  // read below is subject to that user's own RLS, not a privileged view.
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user || !user.email) {
    return Response.json({ message: "Your session has expired. Please sign in again." }, { status: 401, headers: corsHeaders });
  }

  // Re-verifying the password here (not just trusting a valid session
  // token) means a stolen-but-still-valid browser session alone isn't
  // enough to permanently delete the account — matches the same guard
  // used on every other sensitive change on this settings page (change
  // password, change email).
  const { error: passwordError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: body.currentPassword,
  });
  if (passwordError) {
    return Response.json({ message: "Your current password is incorrect." }, { status: 401, headers: corsHeaders });
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // user_profiles and every other table that references it (favorites,
  // enquiries, etc.) cascade-delete via their existing FK constraints —
  // see migration 0004 — so deleting the auth.users row is sufficient,
  // no separate cleanup needed here.
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return Response.json({ message: "Could not delete your account. Please try again." }, { status: 500, headers: corsHeaders });
  }

  return Response.json({ message: "Account deleted." }, { headers: corsHeaders });
});
