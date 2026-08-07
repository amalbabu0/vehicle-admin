import type { Metadata } from "next";
import { Eye } from "lucide-react";
import { getDailyListingCounts, getDailyUserCounts, rollUpMonthly } from "@/lib/admin/analytics-data";
import {
  getFuelTypeDistribution,
  getTransmissionDistribution,
  getTopBrands,
  getTopDistricts,
  getMostViewedListings,
} from "@/lib/admin/dashboard-data";
import { TimeseriesChart } from "@/components/admin/timeseries-chart";
import { DistributionBars } from "@/components/admin/distribution-bars";

export const metadata: Metadata = { title: "Analytics" };
export const revalidate = 0;

const formatDay = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const formatMonth = (date: string) => new Date(`${date}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

export default async function AdminAnalyticsPage() {
  const [dailyListings, dailyUsers, fuelDistribution, transmissionDistribution, topBrands, topDistricts, mostViewed] = await Promise.all([
    getDailyListingCounts(90),
    getDailyUserCounts(90),
    getFuelTypeDistribution(),
    getTransmissionDistribution(),
    getTopBrands(8),
    getTopDistricts(8),
    getMostViewedListings(8),
  ]);

  const monthlyListings = rollUpMonthly(dailyListings);
  const monthlyUsers = rollUpMonthly(dailyUsers);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Growth and listing trends over the last 90 days.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TimeseriesChart title="Daily Listings" data={dailyListings} formatLabel={formatDay} />
        <TimeseriesChart title="Daily User Growth" data={dailyUsers} formatLabel={formatDay} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TimeseriesChart title="Monthly Listings" data={monthlyListings} formatLabel={formatMonth} />
        <TimeseriesChart title="Monthly User Growth" data={monthlyUsers} formatLabel={formatMonth} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DistributionBars title="Fuel Type Distribution" entries={fuelDistribution} />
        <DistributionBars title="Transmission Distribution" entries={transmissionDistribution} />
        <DistributionBars title="Popular Brands" entries={topBrands} />
        <DistributionBars title="Popular Districts" entries={topDistricts} />
      </div>

      <div className="glass-surface rounded-(--glass-radius-lg) p-5">
        <h3 className="text-sm font-semibold">Most Viewed Listings</h3>
        {mostViewed.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No listings yet.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {mostViewed.map((listing) => (
              <li key={listing.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm">
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
  );
}
