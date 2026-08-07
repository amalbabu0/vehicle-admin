import { NextResponse } from "next/server";
import * as z from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({ role: z.enum(["admin", "lister"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireAdmin();
  const { id } = await params;
  const body = await request.json();
  const validation = bodySchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: "Invalid role." }, { status: 400 });
  }

  if (id === profile.id) {
    return NextResponse.json({ message: "You can't change your own role." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("admin_profiles").update({ role: validation.data.role }).eq("id", id);
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  await supabase.rpc("log_audit_event", {
    p_action: "admin_role_changed",
    p_entity_type: "admin",
    p_entity_id: id,
    p_metadata: { role: validation.data.role },
  });

  return NextResponse.json({ message: "Role updated." });
}
