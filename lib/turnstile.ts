import "server-only";

import { env } from "@/lib/env";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type SiteverifyResponse = {
  success: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
};

/**
 * Canonical server-side Turnstile verification. Browser -> this function ->
 * Cloudflare siteverify. Never trust a token without this round trip — the
 * widget alone only proves a challenge was *rendered*, not solved.
 */
export async function verifyTurnstileToken(
  token: string,
  expectedAction: string,
  remoteIp?: string
): Promise<boolean> {
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return false;
  }

  let result: SiteverifyResponse;
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
    });
    if (!res.ok) throw new Error(`siteverify ${res.status}`);
    result = await res.json();
  } catch {
    // Network error, non-2xx, or non-JSON body — fail closed.
    return false;
  }

  if (!result.success || result.action !== expectedAction) {
    return false;
  }

  const expectedHostname = new URL(env.SITE_URL).hostname;
  if (result.hostname !== expectedHostname) {
    return false;
  }

  return true;
}
