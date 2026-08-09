import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/dal";
import { getListingsPage, type ListingsFilter } from "@/lib/admin/listings-data";
import { toCsvField } from "@/lib/csv";

export async function GET(request: Request) {
  await requireAdmin();
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const filter = params as ListingsFilter;

  const { listings } = await getListingsPage(filter, 1, 500);

  const header = ["Name", "Brand", "Model", "Year", "Price", "Fuel Type", "Transmission", "District", "Lister", "Status", "Created"];
  const lines = [header.map(toCsvField).join(",")];
  for (const listing of listings) {
    lines.push(
      [
        listing.name,
        listing.brandName ?? "",
        listing.model ?? "",
        listing.registrationYear ?? "",
        listing.leaseAmount,
        listing.fuelType ?? "",
        listing.transmission ?? "",
        listing.districtName ?? "",
        listing.listerName ?? "",
        listing.status,
        new Date(listing.createdAt).toISOString(),
      ]
        .map(toCsvField)
        .join(",")
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="listings-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
