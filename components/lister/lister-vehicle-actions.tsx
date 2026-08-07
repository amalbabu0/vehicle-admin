"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/database.types";

type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];

/** The single bottom-left status-transition button on a vehicle card — one
 * action at a time, chosen by current status:
 *   draft/archived -> Publish/Republish (published directly; these are the
 *     lister's own voluntary states, no review needed to go live)
 *   published -> Withdraw (pending_approval; pulls it off the public site
 *     and back into the normal review workflow rather than archiving it)
 *   rejected -> Resubmit (pending_approval; an admin already said no once,
 *     so this asks for review again rather than silently republishing)
 *   pending_approval -> nothing shown; only Edit/Delete/Share apply
 * Delete lives in the card's dropdown menu (vehicle-card-menu.tsx), not
 * here. */
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

  const run = (nextStatus: VehicleStatus, successMessage: string) => {
    startTransition(async () => {
      try {
        await patchStatus(id, nextStatus);
        toast.success(successMessage);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to update listing.");
      }
    });
  };

  if (status === "draft") {
    return (
      <Button size="sm" className="min-h-12 active:scale-95" disabled={isPending} onClick={() => run("published", "Listing published.")}>
        Publish
      </Button>
    );
  }

  if (status === "archived") {
    return (
      <Button size="sm" className="min-h-12 active:scale-95" disabled={isPending} onClick={() => run("published", "Listing republished.")}>
        Republish
      </Button>
    );
  }

  if (status === "rejected") {
    return (
      <Button size="sm" className="min-h-12 active:scale-95" disabled={isPending} onClick={() => run("pending_approval", "Resubmitted for review.")}>
        Resubmit
      </Button>
    );
  }

  if (status === "published") {
    return (
      <Button
        size="sm"
        variant="outline"
        className="min-h-12 border-amber-500/40 text-amber-700 hover:bg-amber-500/10 active:scale-95 dark:text-amber-400"
        disabled={isPending}
        onClick={() => run("pending_approval", "Listing withdrawn — it's back in the review queue.")}
      >
        Withdraw
      </Button>
    );
  }

  return null;
}
