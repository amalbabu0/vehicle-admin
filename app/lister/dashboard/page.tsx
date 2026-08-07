import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard — Kerala Lease Hub" };

// Placeholder for the lister dashboard shell's first phase — real stat
// cards (Total/Pending/Approved/Rejected) land in the next phase of the
// lister mobile rebuild.
export default function ListerDashboardPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <LayoutDashboard className="size-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Your lease listing overview is coming here shortly.</p>
    </div>
  );
}
