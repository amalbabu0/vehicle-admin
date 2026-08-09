"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, RotateCcw, Undo2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { Database } from "@/lib/supabase/database.types";

type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];

/** The single status-transition action for a vehicle — one at a time,
 * chosen by current status:
 *   draft/archived -> Publish/Republish (published directly; these are the
 *     lister's own voluntary states, no review needed to go live)
 *   published -> Withdraw (pending_approval; pulls it off the public site
 *     and back into the normal review workflow rather than archiving it)
 *   rejected -> Resubmit (pending_approval; an admin already said no once,
 *     so this asks for review again rather than silently republishing)
 *   pending_approval/sold -> nothing shown
 * Delete lives in the card's dropdown menu (vehicle-card-menu.tsx), not
 * here. Rendered as a DropdownMenuItem inside that same menu (asMenuItem)
 * or as a standalone Button — same transition logic either way. */
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

const ACTIONS: Partial<
  Record<
    VehicleStatus,
    { label: string; icon: LucideIcon; nextStatus: VehicleStatus; successMessage: string; buttonClassName: string }
  >
> = {
  draft: { label: "Publish", icon: Upload, nextStatus: "published", successMessage: "Listing published.", buttonClassName: "" },
  archived: { label: "Republish", icon: Upload, nextStatus: "published", successMessage: "Listing republished.", buttonClassName: "" },
  rejected: {
    label: "Resubmit",
    icon: RotateCcw,
    nextStatus: "pending_approval",
    successMessage: "Resubmitted for review.",
    buttonClassName: "",
  },
  published: {
    label: "Withdraw",
    icon: Undo2,
    nextStatus: "pending_approval",
    successMessage: "Listing withdrawn — it's back in the review queue.",
    buttonClassName: "border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400",
  },
};

export function ListerVehicleActions({
  id,
  status,
  asMenuItem = false,
}: {
  id: string;
  status: VehicleStatus;
  /** Render as a DropdownMenuItem for use inside VehicleCardMenu's "Edit" list, instead of a standalone Button. */
  asMenuItem?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const action = ACTIONS[status];
  if (!action) return null;

  const run = () => {
    startTransition(async () => {
      try {
        await patchStatus(id, action.nextStatus);
        toast.success(action.successMessage);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to update listing.");
      }
    });
  };

  const Icon = action.icon;

  if (asMenuItem) {
    return (
      <DropdownMenuItem onSelect={run} disabled={isPending}>
        <Icon className="size-4" /> {action.label}
      </DropdownMenuItem>
    );
  }

  return (
    <Button
      size="sm"
      variant={status === "published" ? "outline" : "default"}
      className={`min-h-12 active:scale-95 ${action.buttonClassName}`}
      disabled={isPending}
      onClick={run}
    >
      {action.label}
    </Button>
  );
}
