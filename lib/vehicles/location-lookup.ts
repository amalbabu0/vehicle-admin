import "server-only";

import { createClient } from "@/lib/supabase/server";

export type LocationLookup = Map<string, { name: string; districtName: string }>;

/** Same district-resolution pattern as the user app's lib/data/locations.ts
 * (intentionally duplicated — no shared package between the two apps). */
export async function getLocationLookup(): Promise<LocationLookup> {
  const supabase = await createClient();
  const { data } = await supabase.from("locations").select("id, name, parent_location_id");
  const rows = data ?? [];
  const byId = new Map(rows.map((row) => [row.id, row]));

  const lookup: LocationLookup = new Map();
  for (const row of rows) {
    const parent = row.parent_location_id ? byId.get(row.parent_location_id) : null;
    lookup.set(row.id, { name: row.name, districtName: parent ? parent.name : row.name });
  }
  return lookup;
}
