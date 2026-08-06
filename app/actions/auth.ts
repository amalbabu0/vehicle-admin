"use server";

import * as z from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

export type ActionState = {
  errors?: Record<string, string[]>;
  message?: string;
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
  const { success: withinLimit } = await checkRateLimit(authRateLimit, `login:${ip}`);
  if (!withinLimit) {
    return { message: "Too many attempts. Try again in a few minutes." };
  }

  const humanVerified = await verifyTurnstileToken(validated.data.turnstileToken, "login", ip);
  if (!humanVerified) {
    return { message: "Verification failed. Please try again." };
  }

  const { email, password } = validated.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { message: "Incorrect email or password." };
  }

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "lister")) {
    await supabase.auth.signOut();
    return { message: "This account doesn't have access to the admin portal." };
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
      return { message: "This account doesn't have access to the admin portal." };
    }
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

// ============================================================================
// Google OAuth
// ============================================================================

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${env.SITE_URL}/auth/callback` },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth_failed");
  }

  redirect(data.url);
}
