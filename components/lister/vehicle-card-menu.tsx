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
import { BookingStatusMenuItem } from "@/components/lister/booking-status-menu-item";
import type { Database } from "@/lib/supabase/database.types";

type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];
type BookingStatus = Database["public"]["Enums"]["vehicle_booking_status"];

export function VehicleCardMenu({
  id,
  status,
  bookingStatus,
  shareUrl,
  showViewDetails,
}: {
  id: string;
  status: VehicleStatus;
  bookingStatus: BookingStatus;
  shareUrl: string;
  showViewDetails: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isBookingPending, startBookingTransition] = useTransition();
  const [confirmBooking, setConfirmBooking] = useState(false);

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

  const nextBookingStatus: BookingStatus = bookingStatus === "booked" ? "available" : "booked";

  const updateBookingStatus = () => {
    startBookingTransition(async () => {
      const response = await fetch(`/api/vehicles/${id}/booking-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingStatus: nextBookingStatus }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(payload.message || "Unable to update the vehicle right now. Please try again.");
        return;
      }
      toast.success(payload.message);
      setConfirmBooking(false);
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
          {/* Booking is only meaningful for a live listing — but still
              offered when already booked so a lister can always reverse it,
              even if the listing's lifecycle status later changed. */}
          {status === "published" || bookingStatus === "booked" ? (
            <BookingStatusMenuItem bookingStatus={bookingStatus} onSelect={() => setConfirmBooking(true)} />
          ) : null}
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

      {/* Sibling of DropdownMenu, not nested inside it — same reasoning as
          the Delete dialog above. See booking-status-menu-item.tsx. */}
      <AlertDialog open={confirmBooking} onOpenChange={(open) => { if (!isBookingPending) setConfirmBooking(open); }}>
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
            <AlertDialogCancel disabled={isBookingPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={updateBookingStatus} disabled={isBookingPending}>
              {isBookingPending ? "Updating…" : bookingStatus === "booked" ? "Mark as Available" : "Mark as Booked"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
