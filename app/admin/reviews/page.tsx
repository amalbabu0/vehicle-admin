import type { Metadata } from "next";
import { Star } from "lucide-react";
import { ComingSoon } from "@/components/admin/coming-soon";

export const metadata: Metadata = { title: "Reviews" };

export default function AdminReviewsPage() {
  return (
    <ComingSoon
      icon={Star}
      title="Reviews"
      description="Moderate customer reviews."
      planned={[
        "No reviews table exists in the schema yet — this needs a migration first",
        "View / approve / reject / delete",
      ]}
    />
  );
}
