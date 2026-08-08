import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/dal";
import { permanentlyDeleteVehicle } from "@/lib/vehicles/permanent-delete";

// Admin-only, deliberately separate from the soft-delete PATCH action on
// the sibling route — this is the one path that actually removes the
// listing, its images, and every cascade-related record for good. See
// lib/vehicles/permanent-delete.ts for the full cleanup order/idempotency
// notes (same function the 10-day cleanup cron calls).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireAdmin();
  const { id } = await params;

  const result = await permanentlyDeleteVehicle(id, { id: profile.id, role: "admin" });

  if (!result.ok) {
    return NextResponse.json(
      { message: "Couldn't delete this listing's images. Nothing was removed — try again shortly." },
      { status: 502 }
    );
  }

  return NextResponse.json({ message: "Listing permanently deleted." });
}
