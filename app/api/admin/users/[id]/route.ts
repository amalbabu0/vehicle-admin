import { NextResponse } from "next/server";
import * as z from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const actionSchema = z.object({ action: z.enum(["suspend", "activate"]) });

// Permanently far in the future, matching Supabase's own convention for a
// "banned until unbanned" state — there's no infinite option, only a duration.
const SUSPEND_DURATION = "876000h";

// log_audit_event() reads auth.uid() from the caller's own session
// internally, so this must be called with the cookie-bound client (the
// signed-in admin's session), never the service-role client.
async function logUserAction(action: string, userId: string) {
  const supabase = await createClient();
  await supabase.rpc("log_audit_event", { p_action: action, p_entity_type: "user", p_entity_id: userId });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const body = await request.json();
  const validation = actionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: "Invalid action." }, { status: 400 });
  }

  const service = createServiceRoleClient();
  const { error } = await service.auth.admin.updateUserById(id, {
    ban_duration: validation.data.action === "suspend" ? SUSPEND_DURATION : "none",
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  await logUserAction(validation.data.action === "suspend" ? "user_suspended" : "user_activated", id);

  return NextResponse.json({ message: validation.data.action === "suspend" ? "User suspended." : "User activated." });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const service = createServiceRoleClient();
  const { error } = await service.auth.admin.deleteUser(id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  await logUserAction("user_deleted", id);

  return NextResponse.json({ message: "User deleted." });
}
