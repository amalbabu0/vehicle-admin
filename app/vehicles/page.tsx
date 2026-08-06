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

export default async function VehiclesPage() {
  await requireAdminOrLister();
  const supabase = await createClient();
  const { data: vehicles, error } = await supabase
    .from("vehicles")
    .select(
      "id,name,status,lease_amount,lease_period,view_count,created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Unable to load vehicle listings.");
  }

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
              {vehicles?.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell>{vehicle.name}</TableCell>
                  <TableCell>{vehicle.status}</TableCell>
                  <TableCell>₹{vehicle.lease_amount.toLocaleString()}</TableCell>
                  <TableCell>{vehicle.lease_period}</TableCell>
                  <TableCell>{vehicle.view_count}</TableCell>
                  <TableCell>{new Date(vehicle.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {vehicles?.length === 0 ? (
          <div className="rounded-3xl border border-border bg-background/80 p-6 text-sm text-muted-foreground shadow-sm shadow-black/5">
            No vehicle listings were found for your account.
          </div>
        ) : null}
      </div>
    </main>
  );
}
