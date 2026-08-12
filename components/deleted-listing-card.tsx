"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { differenceInCalendarDays, format } from "date-fns";
import { toast } from "sonner";
import { ImageOff, RotateCcw, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/lister/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

/** Placeholder for the card above — same aspect-4/3 image, the same 4-5 text
 * lines (5 when `showListerLine` mirrors the admin variant's extra "Lister:
 * …" row), and the same button row (2 buttons only when `showDeleteButton`
 * mirrors `canPermanentlyDelete`, admin-only). */
export function DeletedListingCardSkeleton({ showListerLine = false, showDeleteButton = false }: { showListerLine?: boolean; showDeleteButton?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      <Skeleton className="aspect-4/3 w-full rounded-none" />
      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
        </div>
        {showListerLine ? <Skeleton className="h-3 w-1/2" /> : null}
        <Skeleton className="h-3 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
        <div className="flex items-center gap-2 pt-1.5">
          <Skeleton className="h-8 w-24 rounded-md" />
          {showDeleteButton ? <Skeleton className="h-8 w-36 rounded-md" /> : null}
        </div>
      </div>
    </div>
  );
}

export function DeletedListingCard({
  id,
  name,
  status,
  coverImageUrl,
  coverThumbnailUrl,
  listerName,
  deletedByName,
  deletedByRole,
  deletedAt,
  permanentDeleteAt,
  canPermanentlyDelete = false,
}: {
  id: string;
  name: string;
  status: string;
  coverImageUrl: string | null;
  coverThumbnailUrl: string | null;
  /** Admin view only — a lister's own Deleted Listings page has nothing to
   * disambiguate (every card is already theirs). */
  listerName?: string | null;
  deletedByName: string | null;
  deletedByRole: string | null;
  deletedAt: string;
  permanentDeleteAt: string;
  /** Only the admin app passes this — permanent deletion is admin-only. */
  canPermanentlyDelete?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmPermanent, setConfirmPermanent] = useState(false);

  const daysRemaining = Math.max(0, differenceInCalendarDays(new Date(permanentDeleteAt), new Date()));
  const cardImageUrl = coverThumbnailUrl ?? coverImageUrl;

  const restore = () => {
    startTransition(async () => {
      const response = await fetch(`/api/vehicles/${id}/restore`, { method: "POST" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        toast.error(payload.message || "Unable to restore listing.");
        return;
      }
      toast.success("Listing restored.");
      setConfirmRestore(false);
      router.refresh();
    });
  };

  const permanentDelete = () => {
    startTransition(async () => {
      const response = await fetch(`/api/admin/listings/${id}/permanent-delete`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        toast.error(payload.message || "Unable to permanently delete listing.");
        return;
      }
      toast.success("Listing permanently deleted successfully.");
      setConfirmPermanent(false);
      router.refresh();
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      <div className="relative aspect-4/3 w-full bg-muted">
        {cardImageUrl ? (
          <Image src={cardImageUrl} alt={name} fill sizes="(max-width: 640px) 50vw, 340px" className="object-cover opacity-80" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-11" />
          </div>
        )}
      </div>

      <div className="space-y-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-semibold">{name}</p>
          <StatusBadge status={status} />
        </div>

        {listerName ? <p className="text-xs text-muted-foreground">Lister: {listerName}</p> : null}
        <p className="text-xs text-muted-foreground">
          Deleted by: {deletedByName ?? "Unknown"}
          {deletedByRole ? ` (${deletedByRole})` : ""}
        </p>
        <p className="text-xs text-muted-foreground">Deleted: {format(new Date(deletedAt), "dd MMM yyyy")}</p>
        <p className="text-xs text-muted-foreground">Permanent deletion: {format(new Date(permanentDeleteAt), "dd MMM yyyy")}</p>
        <p className={`text-xs font-medium ${daysRemaining <= 2 ? "text-destructive" : "text-amber-600 dark:text-amber-500"}`}>
          {daysRemaining} day{daysRemaining === 1 ? "" : "s"} remaining
        </p>

        <div className="flex items-center gap-2 pt-1.5">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setConfirmRestore(true)} disabled={isPending}>
            <RotateCcw className="size-3.5" /> Restore
          </Button>
          {canPermanentlyDelete ? (
            <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => setConfirmPermanent(true)} disabled={isPending}>
              <Trash2 className="size-3.5" /> Delete Permanently
            </Button>
          ) : null}
        </div>
      </div>

      <AlertDialog open={confirmRestore} onOpenChange={setConfirmRestore}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this listing?</AlertDialogTitle>
            <AlertDialogDescription>&ldquo;{name}&rdquo; will return to its previous status and become visible again where appropriate.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={restore} disabled={isPending}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmPermanent} onOpenChange={setConfirmPermanent}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently remove the listing and all associated data. The listing, images, cached data,
              search data, and related records will be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={permanentDelete} disabled={isPending}>
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
