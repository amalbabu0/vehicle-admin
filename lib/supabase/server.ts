import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Request-scoped Supabase client for Server Components/Actions/Route
 * Handlers, bound to the current user's session cookie. Respects RLS —
 * this is the client to use for anything the *signed-in admin/lister*
 * is allowed to see, not a privilege-bypass.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component with no response to write to
            // (e.g. during static rendering). Session refresh happens in
            // proxy.ts instead — safe to ignore here.
          }
        },
      },
    }
  );
}

/**
 * Server-only client using the service role key — bypasses RLS entirely.
 * Use ONLY for privileged operations that are already authorized by an
 * explicit role check in the caller (e.g. admin approving another user's
 * listing). Never derive this client from user input, never expose it to
 * a Client Component, never use it as a shortcut around RLS.
 */
export function createServiceRoleClient() {
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // Service-role client is never bound to a browser session.
        },
      },
    }
  );
}
