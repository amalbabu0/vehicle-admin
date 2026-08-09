"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ListerVehicleActions } from "@/components/lister/lister-vehicle-actions";
import type { Database } from "@/lib/supabase/database.types";

type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];

export function VehicleCardMenu({
  id,
  status,
  shareUrl,
  showViewDetails,
}: {
  id: string;
  status: VehicleStatus;
  shareUrl: string;
  showViewDetails: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteVehicle = () => {
    startTransition(async () => {
      const response = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        toast.error(payload.message || "Unable to delete listing.");
        return;
      }
      toast.success("Listing moved to Deleted Listings.");
      setConfirmDelete(false);
      router.refresh();
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            className="size-9 rounded-full bg-background/95 text-foreground shadow-sm hover:bg-background active:scale-95"
            aria-label="Listing actions"
          >
            <Pencil className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {showViewDetails ? (
            <DropdownMenuItem asChild>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                <Eye className="size-4" /> View
              </a>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem asChild>
            <Link href={`/lister/vehicles/${id}/edit`}>
              <Pencil className="size-4" /> Edit
            </Link>
          </DropdownMenuItem>
          <ListerVehicleActions id={id} status={status} asMenuItem />
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move this listing to Deleted Listings?</AlertDialogTitle>
            <AlertDialogDescription>The listing will be kept for 10 days before permanent deletion, and can be restored anytime before then.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={deleteVehicle} disabled={isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
