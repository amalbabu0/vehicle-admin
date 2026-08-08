import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { deleteR2ObjectsByUrl } from "@/lib/r2/delete";
import { env } from "@/lib/env";

/** Best-effort, mirrors the copy in the interactive API routes — a failure
 * here must never fail the deletion itself. */
async function notifyPublicSiteToRevalidate(slug: string) {
  try {
    await fetch(`${env.PUBLIC_SITE_URL}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-revalidate-secret": env.REVALIDATE_SECRET },
      body: JSON.stringify({ slug }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Swallowed — see comment above.
  }
}

export type PermanentDeleteResult =
  | { ok: true; alreadyGone: true }
  | { ok: true; alreadyGone: false; imagesDeleted: number }
  | { ok: false; stage: "r2_cleanup"; error: string };

/** Shared by the interactive admin "Permanently delete" action and the
 * automatic 10-day cleanup cron — see app/api/admin/listings/[id]/
 * permanent-delete/route.ts and app/api/cron/cleanup-deleted-vehicles/
 * route.ts. Always runs via the service-role client since the cron path
 * has no user session to scope RLS against.
 *
 * Order matters: R2 objects are deleted BEFORE the database row. If R2
 * cleanup fails, the function returns without touching the database —
 * the vehicles/vehicle_images rows stay exactly as they were (still
 * is_deleted=true, still past their permanent_delete_at), so the next
 * scheduled run picks the same listing back up and retries. Deleting the
 * DB row first would orphan the R2 objects with no record left of which
 * keys still need cleaning up.
 *
 * Idempotent: if the vehicle row is already gone (a previous run
 * completed it, or it was deleted through some other path), this is a
 * successful no-op rather than an error — safe to call repeatedly.
 */
export async function permanentlyDeleteVehicle(
  vehicleId: string,
  actor: { id: string | null; role: "admin" | "system" }
): Promise<PermanentDeleteResult> {
  const service = createServiceRoleClient();

  const { data: vehicle } = await service.from("vehicles").select("slug").eq("id", vehicleId).maybeSingle();
  if (!vehicle) {
    return { ok: true, alreadyGone: true };
  }

  const { data: images } = await service
    .from("vehicle_images")
    .select("url, medium_url, thumbnail_url")
    .eq("vehicle_id", vehicleId);

  const imageUrls = (images ?? []).flatMap((row) => [row.url, row.medium_url, row.thumbnail_url].filter((u): u is string => Boolean(u)));

  let imagesDeleted = 0;
  try {
    const result = await deleteR2ObjectsByUrl(imageUrls);
    imagesDeleted = result.deleted;
  } catch (error) {
    return { ok: false, stage: "r2_cleanup", error: error instanceof Error ? error.message : "Unknown R2 error" };
  }

  // vehicle_images, favorites, enquiries, reports, etc. all cascade-delete
  // via their existing `on delete cascade` FK to vehicles — no separate
  // cleanup needed for those, see migrations 0001/0004.
  await service.from("vehicles").delete().eq("id", vehicleId);

  await service.from("audit_logs").insert({
    actor_id: actor.id,
    action: "vehicle_permanently_deleted",
    entity_type: "vehicle",
    entity_id: vehicleId,
    metadata: { triggered_by: actor.role, images_deleted: imagesDeleted },
  });

  await notifyPublicSiteToRevalidate(vehicle.slug);

  return { ok: true, alreadyGone: false, imagesDeleted };
}
