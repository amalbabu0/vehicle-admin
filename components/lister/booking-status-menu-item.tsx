import { Ban, CheckCircle2 } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { Database } from "@/lib/supabase/database.types";

type BookingStatus = Database["public"]["Enums"]["vehicle_booking_status"];

/** Just the trigger — no dialog/state of its own. Radix's DropdownMenu
 * unmounts its Content (and everything nested inside it) as soon as an item
 * is selected, so a confirm dialog declared *inside* this component would
 * get unmounted along with the closing menu before a lister could ever
 * interact with it (this is exactly what happened when it briefly owned
 * its own AlertDialog — the dialog flashed open and immediately vanished).
 * The actual dialog now lives in VehicleCardMenu, as a sibling of
 * DropdownMenu rather than a descendant of it — same place Delete's
 * confirm dialog already lived, which never had this problem. */
export function BookingStatusMenuItem({ bookingStatus, onSelect }: { bookingStatus: BookingStatus; onSelect: () => void }) {
  return (
    <DropdownMenuItem onSelect={onSelect}>
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
  );
}
