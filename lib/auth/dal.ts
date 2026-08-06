import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Profile = Database["public"]["Tables"]["admin_profiles"]["Row"];

/**
 * Data Access Layer — the real authorization boundary, alongside RLS.
 * cache() memoizes per request so calling this from multiple Server
 * Components in one render doesn't re-hit Supabase each time. Never rely
 * on proxy.ts or client-side checks alone — see proxy.ts's own comment.
 */
export const verifySession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile> => {
  const user = await verifySession();
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("admin_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    redirect("/login");
  }

  return profile;
});

/**
 * Admin app only allows admin/lister roles. A `user`-role account (e.g.
 * someone who registered on the public site) is rejected here even though
 * they have a valid Supabase session — RLS wouldn't stop them from reading
 * their own profile, but the DAL keeps them out of the admin app entirely.
 */
export async function requireAdminOrLister(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin" && profile.role !== "lister") {
    redirect("/unauthorized");
  }
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") {
    redirect("/unauthorized");
  }
  return profile;
}
