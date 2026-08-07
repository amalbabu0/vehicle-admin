"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import type { Database } from "@/lib/supabase/database.types";

type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];

// Intentionally narrower than the shared VehicleStatusActions component
// (used on the admin-facing /vehicles table): that one lets a caller jump
// straight to "published", which — since /api/vehicles/[id] doesn't check
// role — meant a lister had no actual way to submit a draft for admin
// review at all; they could only skip review entirely. This version only
// ever offers transitions that keep the admin approval step meaningful:
// draft/rejected/archived -> pending_approval (never straight to
// published), pending_approval -> draft (withdraw), published -> archived
// (take down). The shared component and route are untouched.
async function patchStatus(id: string, status: VehicleStatus) {
  const response = await fetch(`/api/vehicles/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "Unable to update listing.");
  }
}

export function ListerVehicleActions({ id, status }: { id: string; status: VehicleStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmTakeDown, setConfirmTakeDown] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const run = (status: VehicleStatus, successMessage: string) => {
    startTransition(async () => {
      try {
        await patchStatus(id, status);
        toast.success(successMessage);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to update listing.");
      }
    });
  };

  const deleteVehicle = () => {
    startTransition(async () => {
      const response = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        toast.error(payload.message || "Unable to delete listing.");
        return;
      }
      toast.success("Listing deleted.");
      setConfirmDelete(false);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {(status === "draft" || status === "rejected" || status === "archived") && (
        <Button size="sm" className="min-h-9" disabled={isPending} onClick={() => run("pending_approval", "Submitted for review.")}>
          Submit for review
        </Button>
      )}
      {status === "pending_approval" && (
        <Button size="sm" variant="outline" className="min-h-9" disabled={isPending} onClick={() => run("draft", "Withdrawn to draft.")}>
          Withdraw
        </Button>
      )}
      {status === "published" && (
        <Button size="sm" variant="outline" className="min-h-9" disabled={isPending} onClick={() => setConfirmTakeDown(true)}>
          Take down
        </Button>
      )}
      {status === "draft" && (
        <Button size="sm" variant="ghost" className="min-h-9 text-destructive hover:text-destructive" disabled={isPending} onClick={() => setConfirmDelete(true)}>
          Delete
        </Button>
      )}

      <AlertDialog open={confirmTakeDown} onOpenChange={setConfirmTakeDown}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Take this listing down?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed from the public site. You can submit it for review again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                run("archived", "Listing taken down.");
                setConfirmTakeDown(false);
              }}
            >
              Take down
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the draft and its images. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteVehicle} disabled={isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
