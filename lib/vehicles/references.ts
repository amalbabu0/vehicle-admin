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

export async function resolveVehicleReferenceIds(client: SupabaseClient<Database>, brand: string, location: string) {
  const [brandId, locationId] = await Promise.all([findBrandId(client, brand), findLocationId(client, location)]);
  return { brandId, locationId };
}
