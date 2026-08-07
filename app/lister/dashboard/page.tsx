import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Car, Clock, CheckCircle2, XCircle, PlusCircle, PackageOpen } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/dal";
import { getListerStats, getListerRecentVehicles } from "@/lib/lister/dashboard-data";
import { ListerStatCard } from "@/components/lister/lister-stat-card";
import { StatusBadge } from "@/components/lister/status-badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard — Kerala Lease Hub" };
export const revalidate = 0;

export default async function ListerDashboardPage() {
  const profile = await getCurrentProfile();
  const [stats, recent] = await Promise.all([getListerStats(profile.id), getListerRecentVehicles(profile.id, 5)]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h2 className="text-xl font-semibold">{profile.full_name ?? "there"}</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ListerStatCard label="Total Vehicles" value={stats.total} icon={Car} />
        <ListerStatCard label="Pending" value={stats.pending} icon={Clock} tone="warning" />
        <ListerStatCard label="Approved" value={stats.approved} icon={CheckCircle2} tone="success" />
        <ListerStatCard label="Rejected" value={stats.rejected} icon={XCircle} tone="destructive" />
      </div>

      <Link href="/vehicles/add" className="block no-underline">
        <Button className="min-h-13 w-full gap-2 text-base">
          <PlusCircle className="size-5" /> Add Vehicle
        </Button>
      </Link>

      <div className="rounded-2xl border border-border bg-background p-4 shadow-sm shadow-black/5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent listings</h3>
          <Link href="/lister/vehicles" className="text-xs font-medium text-primary no-underline">
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center">
            <PackageOpen className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">You haven&apos;t added a vehicle yet.</p>
            <Link href="/vehicles/add" className="mt-1 text-sm font-medium text-primary no-underline">
              Add your first vehicle
            </Link>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {recent.map((vehicle) => (
              <li key={vehicle.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{vehicle.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(vehicle.createdAt), { addSuffix: true })}</p>
                </div>
                <StatusBadge status={vehicle.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
