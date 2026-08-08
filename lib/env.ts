import "server-only";
import * as z from "zod";

/**
 * Server-side env schema for the Admin + Lister portal.
 * Fails fast at boot instead of surfacing `undefined` deep in a request.
 * This app holds the privileged keys (service role, R2 write credentials) —
 * never import this file from a Client Component.
 *
 * None of these are NEXT_PUBLIC_-prefixed, including the 5 that the browser
 * ultimately needs (SUPABASE_URL, SUPABASE_ANON_KEY, IMAGES_CDN_URL,
 * TURNSTILE_SITE_KEY, SITE_URL). Those 5 are handed to the client at runtime
 * via app/api/public-config/route.ts instead of being inlined into the JS
 * bundle at build time — see components/providers/public-config-provider.tsx.
 * This does not make them secret (the browser still receives them), it only
 * changes *when* and *how* — the anon key, Turnstile site key, images CDN
 * URL, and site URL are meant to be visible to visitors either way.
 *
 * Images are stored in Cloudflare R2, not Cloudflare Images (R2 has no
 * subscription requirement and a real free tier — 10GB storage, 1M writes,
 * 10M reads/month, zero egress). Resize/format processing (EXIF strip,
 * compress, AVIF/WebP, thumbnails) happens in our own code with sharp
 * before upload, since R2 has no built-in transform pipeline. Public
 * delivery is via a custom domain connected to the bucket (IMAGES_CDN_URL),
 * which puts it behind Cloudflare's CDN with clean, hash-free URLs.
 */
const envSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  // Public custom domain connected to the bucket, e.g. https://cdn.example.com
  // — no trailing slash. Public object URL = `${IMAGES_CDN_URL}/${key}`.
  IMAGES_CDN_URL: z.url(),

  UPSTASH_REDIS_REST_URL: z.url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  TURNSTILE_SITE_KEY: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(1),

  // Normalized to strip any trailing slash: call sites do
  // `${env.SITE_URL}/path`, and a trailing slash here produces a literal
  // double slash that doesn't string-match Supabase's redirect URL
  // allow-list — a real bug (Supabase falls back to the bare Site URL for
  // anything it doesn't recognize), not cosmetic. This is why the OTP
  // sign-in email's link and the forgot-password link were landing on
  // the homepage instead of their real destination.
  SITE_URL: z.url().transform((url) => url.replace(/\/+$/, "")),
  // The PUBLIC user site's URL (different domain from this admin app's own
  // SITE_URL) — used to build shareable vehicle links, e.g. for WhatsApp
  // sharing from the vehicle list. Also normalized, same reason.
  PUBLIC_SITE_URL: z.url().transform((url) => url.replace(/\/+$/, "")),
  // Shared secret with the user app's POST /api/revalidate — must match its
  // REVALIDATE_SECRET exactly. Lets a status change here instantly refresh
  // the cached public vehicle page instead of waiting out its revalidate
  // window.
  REVALIDATE_SECRET: z.string().min(1),
  // Vercel Cron sends this as `Authorization: Bearer <CRON_SECRET>` on every
  // scheduled request (see vercel.json + app/api/cron/cleanup-deleted-
  // vehicles/route.ts) — checked so the cleanup endpoint can't be triggered
  // by an arbitrary request hitting its URL.
  CRON_SECRET: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid/missing environment variables in admin app:\n${issues}\n\nCopy .env.example to .env.local and fill in real values.`
    );
  }
  return parsed.data;
}

export const env = loadEnv();
