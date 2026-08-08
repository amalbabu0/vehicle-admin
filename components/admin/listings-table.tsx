"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Car, CheckCircle2, XCircle, Star, Trash2 } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ListingRowActions } from "@/components/admin/listing-row-actions";
import type { AdminListingRow } from "@/lib/admin/listings-data";

type Row = AdminListingRow & { shareMessage: string; shareUrl: string };

const STATUS_TONE: Record<string, "outline" | "destructive" | "secondary"> = {
  published: "secondary",
  pending_approval: "outline",
  rejected: "destructive",
  draft: "outline",
  archived: "outline",
  sold: "outline",
};

export function ListingsTable({ initialListings }: { initialListings: Row[] }) {
  const [listings, setListings] = useState(initialListings);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isBulkPending, setIsBulkPending] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const allSelected = listings.length > 0 && selected.size === listings.length;

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(listings.map((listing) => listing.id)));
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleRowChange = (id: string, patch: Partial<AdminListingRow> | "delete") => {
    setListings((prev) => {
      if (patch === "delete") return prev.filter((listing) => listing.id !== id);
      return prev.map((listing) => (listing.id === id ? { ...listing, ...patch } : listing));
    });
    setSelected((prev) => {
      if (patch !== "delete") return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const runBulk = async (action: "approve" | "reject" | "feature" | "delete") => {
    if (selected.size === 0) return;
    setIsBulkPending(true);
    try {
      const ids = [...selected];
      const response = await fetch("/api/admin/listings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });
      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload.message || "Bulk action failed.");
        return;
      }
      toast.success(payload.message);
      if (action === "delete") {
        setListings((prev) => prev.filter((listing) => !ids.includes(listing.id)));
        setConfirmBulkDelete(false);
      } else if (action === "approve") {
        setListings((prev) => prev.map((listing) => (ids.includes(listing.id) ? { ...listing, status: "published" as const } : listing)));
      } else if (action === "reject") {
        setListings((prev) => prev.map((listing) => (ids.includes(listing.id) ? { ...listing, status: "rejected" as const } : listing)));
      } else if (action === "feature") {
        setListings((prev) => prev.map((listing) => (ids.includes(listing.id) ? { ...listing, featured: true } : listing)));
      }
      setSelected(new Set());
    } finally {
      setIsBulkPending(false);
    }
  };

  const bulkBar = useMemo(
    () =>
      selected.size > 0 ? (
        <div className="glass-surface flex flex-wrap items-center gap-2 rounded-(--glass-radius) p-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button type="button" size="sm" variant="outline" disabled={isBulkPending} onClick={() => runBulk("approve")} className="gap-1.5">
            <CheckCircle2 className="size-3.5" /> Approve
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={isBulkPending} onClick={() => runBulk("reject")} className="gap-1.5">
            <XCircle className="size-3.5" /> Reject
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={isBulkPending} onClick={() => runBulk("feature")} className="gap-1.5">
            <Star className="size-3.5" /> Feature
          </Button>
          <Button type="button" size="sm" variant="destructive" disabled={isBulkPending} onClick={() => setConfirmBulkDelete(true)} className="gap-1.5">
            <Trash2 className="size-3.5" /> Delete
          </Button>
        </div>
      ) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, isBulkPending]
  );

  return (
    <div className="space-y-3">
      {bulkBar}
      <div className="overflow-x-auto rounded-(--glass-radius-lg) border border-border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
              </TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Fuel / Transmission</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Lister</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-40">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Car className="size-8" />
                    <p className="text-sm">No listings match these filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              listings.map((listing) => (
                <TableRow key={listing.id}>
                  <TableCell>
                    <Checkbox checked={selected.has(listing.id)} onCheckedChange={() => toggleOne(listing.id)} aria-label={`Select ${listing.name}`} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {listing.coverThumbnailUrl ?? listing.coverImageUrl ? (
                          <Image src={listing.coverThumbnailUrl ?? listing.coverImageUrl!} alt={listing.name} fill sizes="48px" className="object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <Car className="size-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{listing.name}</p>
                        <p className="text-xs text-muted-foreground">{listing.registrationYear ?? "—"}</p>
                      </div>
                      {listing.featured ? (
                        <Star className="size-3.5 shrink-0 fill-amber-500 text-amber-500" aria-label="Featured" />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    ₹{listing.leaseAmount.toLocaleString("en-IN")}
                    <span className="text-xs text-muted-foreground"> /{listing.leasePeriod}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[listing.fuelType, listing.transmission].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{listing.districtName ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{listing.listerName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_TONE[listing.status] ?? "outline"} className="capitalize">
                      {listing.status.replaceAll("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(listing.createdAt).toLocaleDateString("en-IN")}</TableCell>
                  <TableCell>
                    <ListingRowActions
                      listing={listing}
                      shareMessage={listing.shareMessage}
                      shareUrl={listing.shareUrl}
                      onChanged={(patch) => handleRowChange(listing.id, patch)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move {selected.size} listing{selected.size === 1 ? "" : "s"} to Deleted Listings?</AlertDialogTitle>
            <AlertDialogDescription>Each will be kept for 10 days before permanent deletion, and can be restored anytime before then.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => runBulk("delete")} disabled={isBulkPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
