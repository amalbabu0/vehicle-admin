"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "all", label: "All Listings" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "featured", label: "Featured" },
] as const;

export function ListingsTabs() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "all";

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border">
      {TABS.map((tab) => {
        const params = new URLSearchParams(searchParams.toString());
        if (tab.value === "all") params.delete("tab");
        else params.set("tab", tab.value);
        params.delete("page");
        const href = `/admin/listings${params.toString() ? `?${params.toString()}` : ""}`;
        const active = activeTab === tab.value;
        return (
          <Link
            key={tab.value}
            href={href}
            className={cn(
              "shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium no-underline transition-colors",
              active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
