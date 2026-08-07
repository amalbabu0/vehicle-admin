import type { Metadata } from "next";
import { Car } from "lucide-react";
import { ComingSoon } from "@/components/admin/coming-soon";

export const metadata: Metadata = { title: "Listers" };

export default function AdminListingsPage() {
  return (
    <ComingSoon
      icon={Car}
      title="Listers"
      description="Manage all vehicle listings from one module."
      planned={[
        "Tabs: All / Pending / Approved / Rejected / Featured",
        "Filters: status, brand, category, fuel, transmission, district, date, lister",
        "Approve / reject / feature / delete, each logged",
        "Bulk actions and export",
        "Share on WhatsApp (already live on /vehicles)",
      ]}
    />
  );
}
