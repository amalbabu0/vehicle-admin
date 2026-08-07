import { NextResponse } from "next/server";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrLister } from "@/lib/auth/dal";

const statusUpdateSchema = z.object({
  status: z.enum(["draft", "pending_approval", "published", "rejected", "archived", "sold"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdminOrLister();
  const { id } = await params;
  const body = await request.json();
  const validation = statusUpdateSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ message: "Invalid status." }, { status: 400 });
  }

  const { status } = validation.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("vehicles")
    .update(status === "published" ? { status, published_at: new Date().toISOString() } : { status })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Listing status updated." });
}
