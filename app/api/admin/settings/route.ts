import { NextResponse } from "next/server";
import * as z from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { SETTINGS_KEYS } from "@/lib/admin/settings-data";
import type { Json } from "@/lib/supabase/database.types";

const bodySchema = z.object({
  key: z.enum(SETTINGS_KEYS),
  value: z.union([z.string(), z.number(), z.boolean(), z.record(z.string(), z.unknown())]),
});

export async function PATCH(request: Request) {
  await requireAdmin();
  const body = await request.json();
  const validation = bodySchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: "Invalid settings payload." }, { status: 400 });
  }

  const { key, value } = validation.data;
  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").upsert({ key, value: value as Json });
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  await supabase.rpc("log_audit_event", { p_action: "settings_updated", p_entity_type: "site_settings", p_metadata: { key } });

  return NextResponse.json({ message: "Settings saved." });
}
