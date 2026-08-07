import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/admin/coming-soon";

export const metadata: Metadata = { title: "Analytics" };

export default function AdminAnalyticsPage() {
  return (
    <ComingSoon
      icon={BarChart3}
      title="Analytics"
      description="Growth and listing analytics over time."
      planned={[
        "Daily / monthly listing trends",
        "User growth over time",
        "Fuel type & transmission distribution",
        "Popular brands & districts",
        "Most viewed listings",
      ]}
    />
  );
}
