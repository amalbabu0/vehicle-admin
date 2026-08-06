// Shared shape between the server route (app/api/public-config/route.ts)
// and the client provider (components/providers/public-config-provider.tsx).
// These 5 values are not secret — they're delivered at runtime instead of
// build time purely to avoid the NEXT_PUBLIC_ naming convention, not to
// hide them from visitors. See lib/env.ts for the full rationale.
export type PublicConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  turnstileSiteKey: string;
  imagesCdnUrl: string;
  siteUrl: string;
};
