import "server-only";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type GeneralSettings = { siteName: string; logoUrl: string; faviconUrl: string };
export type SeoSettings = { metaTitle: string; metaDescription: string; keywords: string; ogImageUrl: string };
export type SocialLinks = { facebook: string; instagram: string; linkedin: string; youtube: string };
/** Numeric-looking fields are stored as strings — they come from plain text
 * inputs in SettingsForm and aren't parsed/enforced anywhere yet (see the
 * Storage tab's own note), so there's no reason to round-trip through
 * number and risk a NaN on a blank field. */
export type SecuritySettings = { sessionTimeoutMinutes: string };
export type StorageSettings = { maxUploadSizeMb: string; backupFrequency: string };

const DEFAULTS: {
  general: GeneralSettings;
  seo: SeoSettings;
  social: SocialLinks;
  security: SecuritySettings;
  storage: StorageSettings;
} = {
  general: { siteName: "Kerala Lease Hub", logoUrl: "", faviconUrl: "" },
  seo: { metaTitle: "", metaDescription: "", keywords: "", ogImageUrl: "" },
  social: { facebook: "", instagram: "", linkedin: "", youtube: "" },
  security: { sessionTimeoutMinutes: "60" },
  storage: { maxUploadSizeMb: "10", backupFrequency: "managed-by-supabase" },
};

/** Settings keys this module is allowed to read/write. Kept separate from
 * other site_settings keys (featured_listing_ids, contact_info, etc.) so
 * the settings API can't be pointed at arbitrary rows. */
export const SETTINGS_KEYS = ["general_settings", "seo_settings", "social_links", "maintenance_mode", "security_settings", "storage_settings"] as const;
export type SettingsKey = (typeof SETTINGS_KEYS)[number];

export type AllSettings = {
  general: GeneralSettings;
  seo: SeoSettings;
  social: SocialLinks;
  maintenanceMode: boolean;
  security: SecuritySettings;
  storage: StorageSettings;
};

export async function getAllSettings(): Promise<AllSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("key, value").in("key", SETTINGS_KEYS);
  const byKey = new Map((data ?? []).map((row) => [row.key, row.value]));

  return {
    general: { ...DEFAULTS.general, ...(byKey.get("general_settings") as Partial<GeneralSettings> | undefined) },
    seo: { ...DEFAULTS.seo, ...(byKey.get("seo_settings") as Partial<SeoSettings> | undefined) },
    social: { ...DEFAULTS.social, ...(byKey.get("social_links") as Partial<SocialLinks> | undefined) },
    maintenanceMode: byKey.get("maintenance_mode") === true,
    security: { ...DEFAULTS.security, ...(byKey.get("security_settings") as Partial<SecuritySettings> | undefined) },
    storage: { ...DEFAULTS.storage, ...(byKey.get("storage_settings") as Partial<StorageSettings> | undefined) },
  };
}

type AdminRole = Database["public"]["Enums"]["admin_role"];

export type AdminAccount = { id: string; fullName: string | null; email: string | null; role: AdminRole; createdAt: string };

/** admin_profiles is a small table (one row per admin/lister login) — a
 * per-row auth admin API lookup for email is fine here, same reasoning as
 * getUsersPage's per-page enrichment. */
export async function getAdminAccounts(): Promise<AdminAccount[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("admin_profiles").select("id, full_name, role, created_at").order("created_at", { ascending: true });
  const rows = data ?? [];

  const service = createServiceRoleClient();
  const enriched = await Promise.all(
    rows.map(async (row) => {
      const { data: authData } = await service.auth.admin.getUserById(row.id);
      return { id: row.id, fullName: row.full_name, email: authData?.user?.email ?? null, role: row.role, createdAt: row.created_at };
    })
  );
  return enriched;
}
