"use server";

import * as z from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { authRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import type { Json } from "@/lib/supabase/database.types";

// ============================================================================
// Schemas
// ============================================================================

const passwordSchema = z
  .string()
  .min(8, { error: "Be at least 8 characters long." })
  .regex(/[a-zA-Z]/, { error: "Contain at least one letter." })
  .regex(/[0-9]/, { error: "Contain at least one number." })
  .regex(/[^a-zA-Z0-9]/, { error: "Contain at least one special character." });

const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }).trim(),
  password: z.string().min(1, { error: "Password is required." }),
  turnstileToken: z.string().min(1, { error: "Complete the verification challenge." }),
});

const forgotPasswordSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }).trim(),
  turnstileToken: z.string().min(1, { error: "Complete the verification challenge." }),
});

const resetPasswordSchema = z.object({
  password: passwordSchema,
});

const verifyOtpSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }).trim(),
  // Not hardcoded to 6 digits: this project's live Auth settings actually
  // issue an 8-digit code (config.toml says 6, but that file is stale
  // against the real project — see the login OTP commit). Rather than
  // guess the exact configured length here too, accept any reasonable
  // numeric code and let verifyOtp() itself be the real check.
  otp: z.string().trim().regex(/^\d{4,10}$/, { error: "Enter the code from your email." }),
});

export type ActionState = {
  errors?: Record<string, string[]>;
  message?: string;
  /** Set by login() for an admin account whose password just checked out —
   * the client shows the OTP-entry form instead of navigating away. See
   * verifyAdminOtp() below for why the session isn't valid yet at this point. */
  otpRequired?: boolean;
  email?: string;
} | undefined;

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * The admin portal only authenticates existing accounts in admin_profiles.
 * There is no self-service admin registration in this app. The service
 * role client is not used here, and role validation is enforced by the
 * callback/login paths plus RLS.
 */
async function logAuditEvent(action: string, entityId?: string, metadata: Record<string, Json> = {}) {
  const supabase = await createClient();
  await supabase.rpc("log_audit_event", {
    p_action: action,
    p_entity_type: "auth",
    p_entity_id: entityId,
    p_metadata: metadata,
  });
}

/** Uses the dedicated log_failed_login() RPC, not logAuditEvent() above —
 * this needs to work before there's a session (rate-limited, wrong
 * password, etc.), and that RPC is deliberately narrower than the general
 * one (see migration 0017) since it's reachable by anon callers. */
async function logFailedLogin(email: string, ip: string, reason: string) {
  const supabase = await createClient();
  await supabase.rpc("log_failed_login", { p_email: email, p_ip: ip, p_reason: reason });
}

// ============================================================================
// login
// ============================================================================

export async function login(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const validated = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    turnstileToken: formData.get("turnstileToken"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors as Record<string, string[]> };
  }

  const ip = await clientIp();
  const { email } = validated.data;
  const { success: withinLimit } = await checkRateLimit(authRateLimit, `login:${ip}`);
  if (!withinLimit) {
    await logFailedLogin(email, ip, "rate_limited");
    return { message: "Too many attempts. Try again in a few minutes." };
  }

  const humanVerified = await verifyTurnstileToken(validated.data.turnstileToken, "login", ip);
  if (!humanVerified) {
    await logFailedLogin(email, ip, "turnstile_failed");
    return { message: "Verification failed. Please try again." };
  }

  const { password } = validated.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    await logFailedLogin(email, ip, "invalid_credentials");
    return { message: "Incorrect email or password." };
  }

  const service = createServiceRoleClient();
  const { data: profile, error: profileError } = await service
    .from("admin_profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile || (profile.role !== "admin" && profile.role !== "lister")) {
    await supabase.auth.signOut();
    await logFailedLogin(email, ip, "unauthorized_role");
    return { message: "This account doesn't have access to the admin portal." };
  }

  if (profile.role === "admin") {
    const { data: setting } = await service
      .from("site_settings")
      .select("value")
      .eq("key", "admin_email")
      .single();

    const allowedEmail = typeof setting?.value === "string" ? setting.value : null;
    if (!allowedEmail || data.user.email?.toLowerCase() !== allowedEmail.toLowerCase()) {
      await supabase.auth.signOut();
      await logFailedLogin(email, ip, "unauthorized_email");
      return { message: "This account doesn't have access to the admin portal." };
    }

    // Password verified and the account is authorized — but the admin
    // role requires a second factor. signInWithPassword already created a
    // real, valid session the moment the password checked out; sign it
    // back out immediately so a correct password alone can never leave a
    // usable session sitting in the browser. The account isn't actually
    // considered logged in until verifyAdminOtp() below succeeds, which is
    // what creates the session that sticks.
    await supabase.auth.signOut();

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (otpError) {
      await logFailedLogin(email, ip, "otp_send_failed");
      return { message: "Couldn't send your sign-in code. Please try again." };
    }

    return { otpRequired: true, email };
  }

  await logAuditEvent("login", data.user.id);
  redirect("/");
}

// ============================================================================
// verifyAdminOtp — second factor for admin (not lister) accounts, see login()
// ============================================================================

export async function verifyAdminOtp(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const emailInput = formData.get("email");
  const validated = verifyOtpSchema.safeParse({
    email: emailInput,
    otp: formData.get("otp"),
  });

  if (!validated.success) {
    return {
      errors: z.flattenError(validated.error).fieldErrors as Record<string, string[]>,
      otpRequired: true,
      email: typeof emailInput === "string" ? emailInput : undefined,
    };
  }

  const { email, otp } = validated.data;
  const ip = await clientIp();

  const { success: withinLimit } = await checkRateLimit(authRateLimit, `otp-verify:${email}`);
  if (!withinLimit) {
    await logFailedLogin(email, ip, "otp_rate_limited");
    return { message: "Too many attempts. Sign in again to request a new code." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });

  if (error || !data.user) {
    await logFailedLogin(email, ip, "otp_invalid");
    return { message: "Incorrect or expired code. Try again.", otpRequired: true, email };
  }

  await logAuditEvent("login", data.user.id);
  redirect("/");
}

// ============================================================================
// logout
// ============================================================================

export async function logout() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await logAuditEvent("logout", user.id);
  }
  await supabase.auth.signOut();
  redirect("/login");
}

// ============================================================================
// forgot / reset password
// ============================================================================

export async function forgotPassword(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const validated = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
    turnstileToken: formData.get("turnstileToken"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors as Record<string, string[]> };
  }

  const ip = await clientIp();
  const { success: withinLimit } = await checkRateLimit(authRateLimit, `forgot:${ip}`);
  if (!withinLimit) {
    return { message: "Too many attempts. Try again in a few minutes." };
  }

  const humanVerified = await verifyTurnstileToken(validated.data.turnstileToken, "forgot_password", ip);
  if (!humanVerified) {
    return { message: "Verification failed. Please try again." };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(validated.data.email, {
    redirectTo: `${env.SITE_URL}/auth/callback?next=/reset-password`,
  });

  // Always the same message whether or not the email exists — don't leak
  // account existence.
  return { message: "If an account exists for that email, a reset link has been sent." };
}

export async function resetPassword(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const validated = resetPasswordSchema.safeParse({ password: formData.get("password") });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors as Record<string, string[]> };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { message: "Your reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password: validated.data.password });
  if (error) {
    return { message: error.message };
  }

  await logAuditEvent("password_reset", user.id);
  redirect("/login");
}

