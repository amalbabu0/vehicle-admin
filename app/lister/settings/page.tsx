import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ListerSettingsForm } from "@/components/lister/lister-settings-form";

export const metadata: Metadata = { title: "Settings — Kerala Lease Hub" };
export const revalidate = 0;

export default async function ListerSettingsPage() {
  const [profile, supabase] = await Promise.all([getCurrentProfile(), createClient()]);
  const { data: userData } = await supabase.auth.getUser();
  return <div className="space-y-5"><div><h2 className="text-2xl font-semibold">Settings</h2><p className="mt-1 text-sm text-muted-foreground">Manage your lister profile and account security.</p></div><ListerSettingsForm name={profile.full_name} phone={profile.phone} email={userData.user?.email ?? ""} /></div>;
}
