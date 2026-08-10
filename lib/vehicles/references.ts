import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const locationAliases: Record<string, string> = {
  trivandrum: "Thiruvananthapuram",
};

async function findBrandId(client: SupabaseClient<Database>, value: string) {
  if (UUID_PATTERN.test(value)) return value;
  const { data, error } = await client.from("brands").select("id").ilike("name", value.trim()).limit(1).maybeSingle();
  if (error) throw error;
  if (data) return data.id;

  const name = value.trim().replace(/\s+/g, " ");
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) return null;

  // Brands are shared lookup data and only the server uses the service role.
  // The caller has already passed requireAdminOrLister before this executes.
  const { data: created, error: createError } = await createServiceRoleClient()
    .from("brands")
    .upsert({ name, slug }, { onConflict: "slug" })
    .select("id")
    .single();
  if (createError) throw createError;
  return created.id;
}

/** Exported for Quick Listing, which resolves a place NAME extracted from a
 * WhatsApp message rather than an id picked from the combobox. Unlike
 * findBrandId above this never creates a row — an unmatched place returns
 * null and the lister picks the location themselves. */
export async function findLocationId(client: SupabaseClient<Database>, value: string) {
  if (UUID_PATTERN.test(value)) return value;
  const names = [value.trim(), locationAliases[value.trim().toLowerCase()]].filter((name): name is string => Boolean(name));
  for (const name of names) {
    const { data, error } = await client.from("locations").select("id").ilike("name", name).limit(1).maybeSingle();
    if (error) throw error;
    if (data) return data.id;
  }
  return null;
}

/** Guards what may be auto-created as a location: a plausible place name,
 * not a stray "N/A", a phone number, or an emoji the extractor mistook for
 * a place. Anything failing this resolves to null and the lister picks the
 * location by hand. */
function looksLikePlaceName(value: string): boolean {
  return value.length >= 3 && value.length <= 60 && /^[\p{L}][\p{L}\s.'-]*$/u.test(value);
}

/**
 * Resolves a free-text place written the way a WhatsApp listing writes it —
 * "MANNAR, ALAPPUZHA", i.e. town first, then district. findLocationId()
 * alone matches the whole string exactly, which fails here because the
 * locations table holds Kerala's districts and taluks but not every town.
 *
 * Order of preference:
 *   1. Each comma-separated part, most specific first — so
 *      "Mannar, Alappuzha" finds no "Mannar" row and lands on the existing
 *      Alappuzha district. Exact match per part, never fuzzy: the closest
 *      name to "Mannar" is "Mannarkkad", a different place in Palakkad
 *      entirely, so a similarity match would file listings under the wrong
 *      district with total confidence.
 *   2. Nothing matched at all (the message named only an unknown town, e.g.
 *      just "Mannar") — create that town as a new location so the place
 *      from the message is kept rather than dropped.
 *
 * The loop runs a handful of times for one field on one record, so it isn't
 * the per-item N+1 pattern PERFORMANCE_STANDARDS.md warns about.
 */
export async function resolveLocationName(client: SupabaseClient<Database>, value: string) {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    const id = await findLocationId(client, part);
    if (id) return id;
  }

  // Nothing in the table matched any part. Keep the most specific name the
  // message gave rather than discarding the location entirely.
  const [mostSpecific] = parts;
  if (!mostSpecific || !looksLikePlaceName(mostSpecific)) return null;

  const name = mostSpecific.replace(/\s+/g, " ");
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) return null;

  // parent_location_id is left null: the message didn't name a district we
  // recognise, so inventing a parent would be a guess. Same service-role
  // reasoning as findBrandId above — locations are shared lookup data, and
  // the caller has already passed requireAdminOrLister.
  const { data: created, error } = await createServiceRoleClient()
    .from("locations")
    .upsert({ name, slug }, { onConflict: "slug" })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

export async function resolveVehicleReferenceIds(client: SupabaseClient<Database>, brand: string, location: string) {
  const [brandId, locationId] = await Promise.all([findBrandId(client, brand), findLocationId(client, location)]);
  return { brandId, locationId };
}
