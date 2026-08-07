import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ListerShell } from "@/components/lister/lister-shell";

// getCurrentProfile() already enforces "must be signed in with a real
// admin_profiles row" (redirects to /login otherwise) — this layout only
// adds the role split on top: admins get bounced to their own dashboard
// instead of seeing the lister-only shell, mirroring how /admin/layout.tsx
// bounces listers the other way. Nothing in the /admin/* app is touched.
export default async function ListerLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();
  if (profile.role !== "lister") {
    redirect("/admin/dashboard");
  }

  const supabase = await createClient();
  const [{ data: rejected }, { data: userData }] = await Promise.all([
    supabase.from("vehicles").select("id, name").eq("lister_id", profile.id).eq("status", "rejected").order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  return (
    <ListerShell profile={{ fullName: profile.full_name, email: userData.user?.email ?? "" }} rejectedListings={rejected ?? []}>
      {children}
    </ListerShell>
  );
}
