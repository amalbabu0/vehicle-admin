import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/admin-shell";

// Real enforcement: requireAdmin() redirects both signed-out visitors and
// signed-in listers to /unauthorized — this whole section is admin-role
// only, matching "Only administrators can access" in the spec. This is a
// brand-new route group; nothing here is reachable from or shared with the
// existing lister-facing pages (/, /vehicles, /vehicles/add), which this
// build intentionally leaves untouched.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireAdmin();

  const supabase = await createClient();
  const [{ count }, { data: userData }] = await Promise.all([
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("status", "pending_approval"),
    supabase.auth.getUser(),
  ]);

  return (
    <AdminShell
      profile={{ fullName: profile.full_name, role: profile.role, email: userData.user?.email ?? "" }}
      pendingApprovalCount={count ?? 0}
    >
      {children}
    </AdminShell>
  );
}
