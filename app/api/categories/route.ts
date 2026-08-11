import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrLister } from "@/lib/auth/dal";

// Powers the Category picker on Quick Listing's review screen, and gives the
// extractor's inferred vehicle type something real to resolve against.
// Fixed, tiny reference table (six rows, seeded in migration 0011), so this
// is deliberately unpaginated — same reasoning as /api/locations.
export async function GET() {
  await requireAdminOrLister();
  const supabase = await createClient();

  const { data, error } = await supabase.from("categories").select("id, name, slug").order("name");

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ options: data.map((category) => ({ id: category.id, label: category.name })) });
}
