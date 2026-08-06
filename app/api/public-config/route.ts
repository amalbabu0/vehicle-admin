import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import type { PublicConfig } from "@/lib/config/public-config";

// Hands the browser the handful of non-secret values it needs (Supabase
// URL/anon key, Turnstile site key, images hash, site URL) at request time.
// This is the runtime-delivery alternative to the NEXT_PUBLIC_ build-time
// inlining convention — it does not add secrecy, it only avoids the
// NEXT_PUBLIC_ prefix in variable names. Cached at the edge for a minute
// since these values change only on redeploy.
export async function GET() {
  const config: PublicConfig = {
    supabaseUrl: env.SUPABASE_URL,
    supabaseAnonKey: env.SUPABASE_ANON_KEY,
    turnstileSiteKey: env.TURNSTILE_SITE_KEY,
    imagesCdnUrl: env.IMAGES_CDN_URL,
    siteUrl: env.SITE_URL,
  };

  return NextResponse.json(config, {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
