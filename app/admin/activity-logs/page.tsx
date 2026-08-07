import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { ComingSoon } from "@/components/admin/coming-soon";

export const metadata: Metadata = { title: "Activity Logs" };

export default function AdminActivityLogsPage() {
  return (
    <ComingSoon
      icon={ScrollText}
      title="Activity Logs"
      description="Full audit trail of admin actions (audit_logs table already exists and is being written to)."
      planned={["Search and filter by action/entity/actor", "Export", "Full-page paginated view (a preview already appears on Dashboard)"]}
    />
  );
}
