"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Eye, Pencil, CheckCircle2, XCircle, Star, StarOff, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { Textarea } from "@/components/ui/textarea";
import { ShareVehicleMenu } from "@/components/share-vehicle-menu";
import type { AdminListingRow } from "@/lib/admin/listings-data";

export function ListingRowActions({
  listing,
  shareMessage,
  shareUrl,
  onChanged,
}: {
  listing: AdminListingRow;
  shareMessage: string;
  shareUrl: string;
  onChanged: (patch: Partial<AdminListingRow> | "delete") => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reason, setReason] = useState("");

  const runAction = (action: string, extra: Record<string, unknown> = {}) => {
    startTransition(async () => {
      const response = await fetch(`/api/admin/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload.message || "Action failed.");
        return;
      }
      toast.success(payload.message);
      if (action === "approve") onChanged({ status: "published" });
      else if (action === "reject") onChanged({ status: "rejected" });
      else if (action === "feature") onChanged({ featured: true });
      else if (action === "unfeature") onChanged({ featured: false });
      else if (action === "delete") onChanged("delete");
      setRejectOpen(false);
      setDeleteOpen(false);
      setReason("");
    });
  };

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <a href={shareUrl} target="_blank" rel="noopener noreferrer">
            <Button type="button" variant="ghost" size="icon" aria-label="View public page">
              <Eye className="size-4" />
            </Button>
          </a>
        </TooltipTrigger>
        <TooltipContent>View public page</TooltipContent>
      </Tooltip>

      <ShareVehicleMenu message={shareMessage} url={shareUrl} imageUrl={listing.coverImageUrl} fileName={listing.slug} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" disabled={isPending} aria-label="More actions">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => toast.info("Editing existing listings is coming in a future pass.")}>
            <Pencil className="size-4" /> Edit
          </DropdownMenuItem>
          {listing.status !== "published" ? (
            <DropdownMenuItem onSelect={() => runAction("approve")}>
              <CheckCircle2 className="size-4" /> Approve
            </DropdownMenuItem>
          ) : null}
          {listing.status !== "rejected" ? (
            <DropdownMenuItem onSelect={() => setRejectOpen(true)}>
              <XCircle className="size-4" /> Reject
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => runAction(listing.featured ? "unfeature" : "feature")}>
            {listing.featured ? <StarOff className="size-4" /> : <Star className="size-4" />}
            {listing.featured ? "Unfeature" : "Feature"}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject &ldquo;{listing.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>Optionally tell the lister why — this is stored on the listing.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason (optional)" rows={3} />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => runAction("reject", { reason })} disabled={isPending}>
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{listing.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the listing and its images. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => runAction("delete")} disabled={isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
