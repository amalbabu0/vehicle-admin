"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getCurrentProfile, verifySession } from "@/lib/auth/dal";

const nameSchema = z.string().trim().min(2, "Enter a name with at least 2 characters.").max(100, "Name is too long.");
const phoneSchema = z.string().trim().regex(/^\+?[0-9][0-9\s()-]{6,19}$/, "Enter a valid phone number.");
const passwordSchema = z.string().min(8, "Use at least 8 characters.").regex(/[a-zA-Z]/, "Include a letter.").regex(/[0-9]/, "Include a number.").regex(/[^a-zA-Z0-9]/, "Include a special character.");

export type ListerSettingsState = { message?: string; error?: string; field?: string } | undefined;

async function requireLister() {
  const profile = await getCurrentProfile();
  if (profile.role !== "lister") throw new Error("Unauthorized");
  return profile;
}

export async function updateListerName(_previous: ListerSettingsState, formData: FormData): Promise<ListerSettingsState> {
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, field: "name" };
  const profile = await requireLister();
  const supabase = await createClient();
  const { error } = await supabase.from("admin_profiles").update({ full_name: parsed.data }).eq("id", profile.id);
  if (error) return { error: "Could not update your name. Please try again." };
  revalidatePath("/lister", "layout");
  return { message: "Name updated successfully." };
}

export async function updateListerPhone(_previous: ListerSettingsState, formData: FormData): Promise<ListerSettingsState> {
  const parsed = phoneSchema.safeParse(formData.get("phone"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, field: "phone" };
  const profile = await requireLister();
  const supabase = await createClient();
  const { error } = await supabase.from("admin_profiles").update({ phone: parsed.data }).eq("id", profile.id);
  if (error) return { error: "Could not update your phone number. Please try again." };
  revalidatePath("/lister", "layout");
  return { message: "Phone number updated successfully." };
}

async function verifyCurrentPassword(password: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email;
  if (!email) return { error: "Your session has expired. Please sign in again." };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { error: "Your current password is incorrect." } : {};
}

export async function changeListerPassword(_previous: ListerSettingsState, formData: FormData): Promise<ListerSettingsState> {
  await requireLister();
  const currentPassword = z.string().min(1, "Enter your current password.").safeParse(formData.get("currentPassword"));
  const nextPassword = passwordSchema.safeParse(formData.get("newPassword"));
  const confirmation = formData.get("confirmPassword");
  if (!currentPassword.success) return { error: currentPassword.error.issues[0]?.message, field: "currentPassword" };
  if (!nextPassword.success) return { error: nextPassword.error.issues[0]?.message, field: "newPassword" };
  if (nextPassword.data !== confirmation) return { error: "New passwords do not match.", field: "confirmPassword" };
  if (nextPassword.data === currentPassword.data) return { error: "Choose a new password that differs from the current one.", field: "newPassword" };
  const verified = await verifyCurrentPassword(currentPassword.data);
  if (verified.error) return verified;
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: nextPassword.data });
  if (error) return { error: error.message };
  return { message: "Password updated successfully." };
}

export async function changeListerEmail(_previous: ListerSettingsState, formData: FormData): Promise<ListerSettingsState> {
  await requireLister();
  const email = z.email("Enter a valid email address.").safeParse(formData.get("email"));
  const currentPassword = z.string().min(1, "Enter your current password.").safeParse(formData.get("currentPassword"));
  if (!email.success) return { error: email.error.issues[0]?.message, field: "email" };
  if (!currentPassword.success) return { error: currentPassword.error.issues[0]?.message, field: "emailCurrentPassword" };
  const verified = await verifyCurrentPassword(currentPassword.data);
  if (verified.error) return verified;
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email: email.data });
  if (error) return { error: error.message };
  return { message: "Check your email to confirm the new address." };
}

export async function deleteListerAccount(_previous: ListerSettingsState, formData: FormData): Promise<ListerSettingsState> {
  await requireLister();
  const confirmation = formData.get("confirmation");
  const currentPassword = z.string().min(1, "Enter your current password.").safeParse(formData.get("currentPassword"));
  if (confirmation !== "DELETE") return { error: 'Type DELETE to confirm.', field: "confirmation" };
  if (!currentPassword.success) return { error: currentPassword.error.issues[0]?.message, field: "deleteCurrentPassword" };
  const verified = await verifyCurrentPassword(currentPassword.data);
  if (verified.error) return verified;
  const user = await verifySession();
  const service = createServiceRoleClient();
  const { error } = await service.auth.admin.deleteUser(user.id);
  if (error) return { error: "Could not delete your account. Please try again." };
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
