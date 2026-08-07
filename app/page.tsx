import { redirect } from "next/navigation";
import { requireAdminOrLister } from "@/lib/auth/dal";

// requireAdminOrLister() is the real enforcement (DAL + RLS) — this route
// only exists to dispatch by role. Admins land on the admin dashboard,
// listers land on the new mobile-first lister dashboard at /lister/dashboard.
export default async function RootPage() {
  const profile = await requireAdminOrLister();
  redirect(profile.role === "admin" ? "/admin/dashboard" : "/lister/dashboard");
}
