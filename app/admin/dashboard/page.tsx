import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Users, Car, Clock, CheckCircle2, XCircle, Star, PlusCircle, UserCheck, Eye } from "lucide-react";
import {
  getDashboardStats,
  getRecentActivity,
  getLatestUsers,
  getLatestListings,
  getMostViewedListings,
  getStatusDistribution,
  getFuelTypeDistribution,
  getTransmissionDistribution,
  getTopBrands,
  getTopDistricts,
} from "@/lib/admin/dashboard-data";
import { StatCard } from "@/components/admin/stat-card";
import { DistributionBars } from "@/components/admin/distribution-bars";
import { StatusDot } from "@/components/lister/status-badge";
import { ShareVehicleMenu } from "@/components/share-vehicle-menu";
import { buildVehicleShareMessage } from "@/lib/vehicles/share";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Dashboard" };
export const revalidate = 0;

export default async function AdminDashboardPage() {
  const [
    stats,
    recentActivity,
    latestUsers,
    latestListings,
    mostViewed,
    statusDistribution,
    fuelDistribution,
    transmissionDistribution,
    topBrands,
    topDistricts,
  ] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(8),
    getLatestUsers(5),
    getLatestListings(5),
    getMostViewedListings(5),
    getStatusDistribution(),
    getFuelTypeDistribution(),
    getTransmissionDistribution(),
    getTopBrands(5),
    getTopDistricts(5),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform overview and key metrics.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Total Users" value={stats.totalUsers} icon={Users} />
        <StatCard label="Total Listings" value={stats.totalListings} icon={Car} />
        <StatCard label="Pending Listings" value={stats.pendingListings} icon={Clock} tone="warning" />
        <StatCard label="Approved Listings" value={stats.approvedListings} icon={CheckCircle2} tone="success" />
        <StatCard label="Rejected Listings" value={stats.rejectedListings} icon={XCircle} tone="destructive" />
        <StatCard label="Featured Listings" value={stats.featuredListings} icon={Star} />
        <StatCard label="New Listings Today" value={stats.newListingsToday} icon={PlusCircle} />
        <StatCard label="Active Users (30d)" value={stats.activeUsers} icon={UserCheck} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-surface rounded-(--glass-radius-lg) p-5">
          <h3 className="text-sm font-semibold">Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No admin activity logged yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentActivity.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-foreground">
                    <span className="font-medium">{item.actorName ?? "System"}</span>{" "}
                    <span className="text-muted-foreground">
                      {item.action.replaceAll("_", " ")} {item.entityType}
                    </span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-surface rounded-(--glass-radius-lg) p-5">
          <h3 className="text-sm font-semibold">Most Viewed Listings</h3>
          {mostViewed.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No listings yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {mostViewed.map((listing) => (
                <li key={listing.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{listing.name}</span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="size-3.5" /> {listing.viewCount.toLocaleString("en-IN")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-surface rounded-(--glass-radius-lg) p-5">
          <h3 className="text-sm font-semibold">Latest Registered Users</h3>
          {latestUsers.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No users registered yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {latestUsers.map((user) => (
                <li key={user.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{user.fullName ?? "Unnamed user"}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-surface rounded-(--glass-radius-lg) p-5">
          <h3 className="text-sm font-semibold">Latest Listings</h3>
          {latestListings.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No listings yet.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {latestListings.map((listing) => {
                const cardImageUrl = listing.coverThumbnailUrl ?? listing.coverImageUrl;
                const shareUrl = `${env.PUBLIC_SITE_URL}/vehicles/${listing.slug}`;
                const shareMessage = buildVehicleShareMessage(
                  {
                    name: listing.name,
                    brandName: listing.brandName,
                    model: null,
                    registrationYear: listing.registrationYear,
                    leaseAmount: listing.leaseAmount,
                    leasePeriod: listing.leasePeriod,
                    fuelType: null,
                    transmission: null,
                    kmDriven: null,
                    ownershipCount: null,
                    districtName: listing.districtName,
                    condition: null,
                    slug: listing.slug,
                  },
                  shareUrl
                );

                return (
                  <li key={listing.id} className="flex items-center gap-3 rounded-xl bg-muted/60 p-2 pr-3 text-sm">
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {cardImageUrl ? (
                        <Image src={cardImageUrl} alt={listing.name} fill sizes="80px" className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <Car className="size-7" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{listing.name}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <StatusDot status={listing.status} />
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {listing.status === "published" ? (
                      <ShareVehicleMenu message={shareMessage} url={shareUrl} imageUrl={listing.coverImageUrl} fileName={listing.slug} />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DistributionBars title="Listing Status Distribution" entries={statusDistribution} />
        <DistributionBars title="Fuel Type Distribution" entries={fuelDistribution} />
        <DistributionBars title="Transmission Distribution" entries={transmissionDistribution} />
        <DistributionBars title="Top Brands" entries={topBrands} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DistributionBars title="Top Districts" entries={topDistricts} />
        <div className="glass-surface flex flex-col justify-center rounded-(--glass-radius-lg) p-5 text-sm text-muted-foreground">
          <p>
            Deeper trend charts (daily/monthly listing and user growth over time) live on the{" "}
            <Link href="/admin/analytics" className="text-foreground underline">
              Analytics
            </Link>{" "}
            page.
          </p>
        </div>
      </div>
    </div>
  );
}
