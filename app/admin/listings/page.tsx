import type { Metadata } from "next";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { getListingsPage, getListerOptions, type ListingsFilter } from "@/lib/admin/listings-data";
import { buildVehicleShareMessage } from "@/lib/vehicles/share";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ListingsTabs } from "@/components/admin/listings-tabs";
import { ListingsFilters } from "@/components/admin/listings-filters";
import { ListingsTable } from "@/components/admin/listings-table";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Listers" };

const PAGE_SIZE = 20;

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function AdminListingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const filter: ListingsFilter = {
    tab: (params.tab as ListingsFilter["tab"]) ?? "all",
    brandId: params.brandId,
    categoryId: params.categoryId,
    fuelType: params.fuelType,
    transmission: params.transmission,
    districtSlug: params.districtSlug,
    listerId: params.listerId,
    search: params.search,
  };

  const supabase = await createClient();
  const [{ listings, total }, listers, { data: brands }, { data: categories }, { data: districts }] = await Promise.all([
    getListingsPage(filter, page, PAGE_SIZE),
    getListerOptions(),
    supabase.from("brands").select("id, name").order("name"),
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("locations").select("slug, name").is("parent_location_id", null).order("name"),
  ]);

  const rows = listings.map((listing) => {
    const shareUrl = `${env.PUBLIC_SITE_URL}/vehicles/${listing.slug}`;
    const shareMessage = buildVehicleShareMessage(
      {
        name: listing.name,
        brandName: listing.brandName,
        model: listing.model,
        registrationYear: listing.registrationYear,
        leaseAmount: listing.leaseAmount,
        leasePeriod: listing.leasePeriod,
        fuelType: listing.fuelType,
        transmission: listing.transmission,
        kmDriven: listing.kmDriven,
        ownershipCount: listing.ownershipCount,
        districtName: listing.districtName,
        condition: listing.condition,
        slug: listing.slug,
      },
      shareUrl
    );
    return { ...listing, shareMessage, shareUrl };
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageLink = (nextPage: number) => {
    const usp = new URLSearchParams(params as Record<string, string>);
    usp.set("page", String(nextPage));
    return `/admin/listings?${usp.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Listers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage all vehicle listings from one module.</p>
        </div>
        <Link href="/admin/vehicles/add" className="no-underline">
          <Button className="gap-2">
            <PlusCircle className="size-4" /> Add Vehicle
          </Button>
        </Link>
      </div>

      <ListingsTabs />
      <ListingsFilters
        brands={brands ?? []}
        categories={categories ?? []}
        districts={districts ?? []}
        listers={listers}
      />

      <p className="text-sm text-muted-foreground">{total.toLocaleString("en-IN")} listing{total === 1 ? "" : "s"} found</p>

      <ListingsTable initialListings={rows} />

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <Link href={pageLink(Math.max(1, page - 1))} className={`rounded-lg border border-border px-4 py-2 no-underline hover:bg-muted ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}>
            Previous
          </Link>
          <span className="text-muted-foreground">Page {page} of {totalPages}</span>
          <Link href={pageLink(page + 1)} className={`rounded-lg border border-border px-4 py-2 no-underline hover:bg-muted ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}>
            Next
          </Link>
        </div>
      ) : null}
    </div>
  );
}
