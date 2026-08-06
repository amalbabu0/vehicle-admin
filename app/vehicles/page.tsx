import Link from "next/link";
import { requireAdminOrLister } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { Database } from "@/lib/supabase/database.types";

const ITEMS_PER_PAGE = 20;

type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];

export default async function VehiclesPage(props: {
  searchParams?: Promise<any> | { page?: string | string[] };
}) {
  await requireAdminOrLister();

  const searchParams = props.searchParams
    ? await Promise.resolve(props.searchParams)
    : undefined;

  const pageParam = Array.isArray(searchParams?.page)
    ? searchParams.page[0]
    : searchParams?.page;
  const page = Math.max(1, Number(pageParam ?? 1));
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  const supabase = await createClient();
  const { data: vehicles, error } = await supabase
    .from("vehicles")
    .select("id,name,status,lease_amount,lease_period,view_count,created_at")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error("Unable to load vehicle listings.");
  }

  const showPagination = (vehicles?.length ?? 0) === ITEMS_PER_PAGE;

  return (
    <main className="flex min-h-screen items-start justify-center p-8">
      <div className="w-full max-w-7xl space-y-6">
        <div className="rounded-3xl border border-border bg-background/80 p-6 shadow-sm shadow-black/5 backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Vehicle listings</p>
              <h1 className="mt-2 text-3xl font-semibold">All vehicle inventory</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Browse the vehicles available to your role. Admin users can view every listing, while listers see only their own inventory.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/" className="no-underline">
                <Button variant="outline">Back to dashboard</Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-background/80 shadow-sm shadow-black/5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lease amount</TableHead>
                <TableHead>Lease period</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles?.length ? (
                vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell>{vehicle.name}</TableCell>
                    <TableCell>{vehicle.status.replaceAll("_", " ")}</TableCell>
                    <TableCell>₹{vehicle.lease_amount.toLocaleString("en-IN")}</TableCell>
                    <TableCell>{vehicle.lease_period}</TableCell>
                    <TableCell>{vehicle.view_count}</TableCell>
                    <TableCell>{new Date(vehicle.created_at).toLocaleDateString("en-IN")}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No vehicle listings found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-background/80 p-4 text-sm text-muted-foreground shadow-sm shadow-black/5">
          <p>
            Showing up to {ITEMS_PER_PAGE} vehicles per page. Only requested columns are loaded for performance.
          </p>
          <div className="inline-flex gap-2">
            <Link href={`/vehicles?page=${Math.max(1, page - 1)}`} className="rounded-lg border border-border bg-muted px-4 py-2 text-sm hover:bg-muted/80">
              Previous
            </Link>
            <span className="px-3 py-2">Page {page}</span>
            <Link
              href={`/vehicles?page=${page + 1}`}
              className={
                "rounded-lg border border-border bg-muted px-4 py-2 text-sm hover:bg-muted/80 " +
                (showPagination ? "" : "pointer-events-none opacity-50")
              }
            >
              Next
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
