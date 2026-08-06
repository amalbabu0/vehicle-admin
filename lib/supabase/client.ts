"use client";

import { useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { usePublicConfig } from "@/lib/config/use-public-config";

/**
 * Browser Supabase client — anon key only, RLS is the security boundary.
 * The URL/anon key arrive at runtime via usePublicConfig() (see
 * app/api/public-config/route.ts) rather than NEXT_PUBLIC_* build-time
 * inlining, so this is a hook, not a plain factory: it returns `null`
 * until config has loaded. Callers should render a loading/skeleton
 * state for that brief window rather than assume the client exists
 * synchronously on first render.
 */
export function useSupabaseBrowserClient(): SupabaseClient<Database> | null {
  const { data: config } = usePublicConfig();

  return useMemo(() => {
    if (!config) return null;
    return createBrowserClient<Database>(config.supabaseUrl, config.supabaseAnonKey);
  }, [config]);
}
