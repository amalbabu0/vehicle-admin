import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permanentlyDeleteVehicle } from "@/lib/vehicles/permanent-delete";
import { env } from "@/lib/env";

// Capped per run so one invocation can't run long enough to hit the
// platform's function timeout — any listings past this count are still
// past their permanent_delete_at and get picked up by tomorrow's run.
// Ten days of retention means a one-day delay here is inconsequential.
const BATCH_LIMIT = 50;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const service = createServiceRoleClient();
  const { data: expired } = await service
    .from("vehicles")
    .select("id")
    .eq("is_deleted", true)
    .lte("permanent_delete_at", new Date().toISOString())
    .limit(BATCH_LIMIT);

  const results = { processed: 0, deleted: 0, alreadyGone: 0, failed: 0 };

  for (const row of expired ?? []) {
    results.processed += 1;
    // Each listing is independent — one failing (e.g. a transient R2
    // error) must not stop the rest of the batch, and it stays eligible
    // for tomorrow's run since its DB row is untouched on failure (see
    // permanentlyDeleteVehicle's ordering notes).
    const result = await permanentlyDeleteVehicle(row.id, { id: null, role: "system" });
    if (!result.ok) {
      results.failed += 1;
      continue;
    }
    if (result.alreadyGone) {
      results.alreadyGone += 1;
    } else {
      results.deleted += 1;
    }
  }

  return NextResponse.json(results);
}
