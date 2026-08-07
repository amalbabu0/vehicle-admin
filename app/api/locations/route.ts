import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrLister } from "@/lib/auth/dal";

// Powers the Location combobox in the manual listing form. Returns every
// location with a display label that includes the parent district (e.g.
// "Adoor — Pathanamthitta") so taluks sharing a name across districts are
// distinguishable, and callers can submit the real id instead of typing a
// name that has to exactly match a row (see lib/vehicles/references.ts).
export async function GET() {
  await requireAdminOrLister();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("locations")
    .select("id, name, parent_location_id")
    .order("name");

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const byId = new Map(data.map((location) => [location.id, location]));
  const options = data.map((location) => {
    const parent = location.parent_location_id ? byId.get(location.parent_location_id) : null;
    return {
      id: location.id,
      label: parent ? `${location.name} — ${parent.name}` : location.name,
    };
  });

  return NextResponse.json({ options });
}
