import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrLister } from "@/lib/auth/dal";

// Powers the Brand combobox in the manual listing form — needs the full
// list for client-side type-to-filter, so this is deliberately unpaginated
// (paginating it would silently hide brands past page 1 from the search).
// brands can grow via free-text entry though (Combobox allowCustomValue +
// auto-create in lib/vehicles/references.ts), unlike the fixed ~90-row
// Kerala locations table, so this keeps a safety cap against unbounded
// growth — 500 is comfortably above any realistic real-world car/bike
// brand catalog, including typo variants.
export async function GET() {
  await requireAdminOrLister();
  const supabase = await createClient();

  const { data, error } = await supabase.from("brands").select("id, name").order("name").limit(500);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ options: data.map((brand) => ({ id: brand.id, label: brand.name })) });
}
