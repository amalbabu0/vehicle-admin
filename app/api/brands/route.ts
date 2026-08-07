import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrLister } from "@/lib/auth/dal";

// Powers the Brand combobox in the manual listing form.
export async function GET() {
  await requireAdminOrLister();
  const supabase = await createClient();

  const { data, error } = await supabase.from("brands").select("id, name").order("name");

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ options: data.map((brand) => ({ id: brand.id, label: brand.name })) });
}
