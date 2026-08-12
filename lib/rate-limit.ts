import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

/** 5 attempts per 5 minutes per IP — login/register/forgot-password. */
export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "5 m"),
  prefix: "ratelimit:auth",
  analytics: true,
});

/**
 * 20 Quick Listing extractions per hour. Keyed on the lister's profile id,
 * NOT their IP: this guards a metered third-party spend (Groq bills per
 * token), which is a per-account cost, and a lister on mobile data changes
 * IP constantly. Request count alone doesn't bound spend — the endpoint
 * also caps input length before calling out and caps max_tokens on the
 * response. See app/api/lister/quick-listing/route.ts.
 */
export const aiExtractRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 h"),
  prefix: "ratelimit:ai-extract",
  analytics: true,
});

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; remaining: number }> {
  const { success, remaining } = await limiter.limit(identifier);
  return { success, remaining };
}

/**
 * Rate-limit an auth attempt on BOTH the caller's IP and the target email;
 * either budget running out blocks it.
 *
 * An IP-only key lets an attacker with many IPs grind one specific account,
 * because every IP starts with its own fresh 5-attempt budget. That matters
 * more here than on the public app: this login tells you when a password is
 * correct — a wrong one returns "Incorrect email or password", a right one
 * returns the OTP form — so unlimited attempts confirm an admin's password
 * outright, leaving only the emailed code in the way.
 *
 * Mirrors the user app's lib/rate-limit.ts; the two apps deliberately share
 * no package, so keep them in sync by hand.
 */
export async function checkAuthRateLimit(action: string, ip: string, email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const [byIp, byEmail] = await Promise.all([
    checkRateLimit(authRateLimit, `${action}:${ip}`),
    checkRateLimit(authRateLimit, `${action}:email:${normalizedEmail}`),
  ]);
  return byIp.success && byEmail.success;
}
