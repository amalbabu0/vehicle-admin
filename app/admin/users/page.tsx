import type { Metadata } from "next";
import { Users } from "lucide-react";
import { ComingSoon } from "@/components/admin/coming-soon";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsersPage() {
  return (
    <ComingSoon
      icon={Users}
      title="Users"
      description="Manage public-site user accounts."
      planned={[
        "Search and filter users",
        "View user profile and their listings",
        "Suspend / activate / delete accounts",
        "Export users",
        "Pagination",
      ]}
    />
  );
}
