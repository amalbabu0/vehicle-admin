"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, CheckCircle2 } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
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

type BookingStatus = Database["public"]["Enums"]["vehicle_booking_status"];

/** Lives in VehicleCardMenu's dropdown, next to the vehicle_status
 * transition (ListerVehicleActions) — a separate component because booking
 * availability is an orthogonal property, not another lifecycle state. */
export function BookingStatusMenuItem({ id, bookingStatus }: { id: string; bookingStatus: BookingStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const nextStatus: BookingStatus = bookingStatus === "booked" ? "available" : "booked";

  const run = () => {
    startTransition(async () => {
      const response = await fetch(`/api/vehicles/${id}/booking-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingStatus: nextStatus }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(payload.message || "Unable to update the vehicle right now. Please try again.");
        return;
      }
      toast.success(payload.message);
      setConfirmOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <DropdownMenuItem onSelect={() => setConfirmOpen(true)}>
        {bookingStatus === "booked" ? (
          <>
            <CheckCircle2 className="size-4" /> Mark as Available
          </>
        ) : (
          <>
            <Ban className="size-4" /> Mark as Booked
          </>
        )}
      </DropdownMenuItem>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => { if (!isPending) setConfirmOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{bookingStatus === "booked" ? "Mark this vehicle as available?" : "Mark this vehicle as booked?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {bookingStatus === "booked"
                ? "Users will be able to call, WhatsApp, and favorite this vehicle again."
                : "Once marked as booked, users will see that this vehicle is already booked and will not be able to call, WhatsApp, or favorite it."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={run} disabled={isPending}>
              {isPending ? "Updating…" : bookingStatus === "booked" ? "Mark as Available" : "Mark as Booked"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
