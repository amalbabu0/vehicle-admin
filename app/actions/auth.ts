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

const registerSchema = z.object({
  fullName: z.string().min(2, { error: "Name must be at least 2 characters." }).trim(),
  email: z.email({ error: "Enter a valid email address." }).trim(),
  password: passwordSchema,
  turnstileToken: z.string().min(1, { error: "Complete the verification challenge." }),
});

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
 * New admin-app signups become `lister` by default (self-service, their
 * listings require approval anyway) — except the very first signup ever,
 * which becomes `admin` so there's a bootstrap path with no manual SQL.
 * Uses the service-role client: RLS's own profiles_update_own policy
 * deliberately blocks a self-update from changing `role` (see
 * supabase/migrations/0002_profiles_role_protection.sql), so this
 * privileged assignment can only happen from trusted server code.
 */
async function assignInitialRole(userId: string): Promise<"admin" | "lister"> {
  const service = createServiceRoleClient();
  const { count } = await service
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  const role = count === 0 ? "admin" : "lister";
  await service.from("profiles").update({ role }).eq("id", userId);
  return role;
}

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
// register
// ============================================================================

export async function register(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const validated = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    turnstileToken: formData.get("turnstileToken"),
  });

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors as Record<string, string[]> };
  }

  const ip = await clientIp();
  const { success: withinLimit } = await checkRateLimit(authRateLimit, `register:${ip}`);
  if (!withinLimit) {
    return { message: "Too many attempts. Try again in a few minutes." };
  }

  const humanVerified = await verifyTurnstileToken(validated.data.turnstileToken, "register", ip);
  if (!humanVerified) {
    return { message: "Verification failed. Please try again." };
  }

  const { fullName, email, password } = validated.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${env.SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { message: error.message };
  }

  if (data.user) {
    await assignInitialRole(data.user.id);
    await logAuditEvent("register", data.user.id, { email });
  }

  return { message: "Check your email to verify your account before signing in." };
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
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "lister")) {
    await supabase.auth.signOut();
    return { message: "This account doesn't have access to the admin portal." };
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
