import { NextResponse } from "next/server";
import { requireAdminOrLister } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export type ListerSearchResult = { id: string; title: string; subtitle: string; href: string };

// Searches the whole shared inventory (migration 0035), which is what the
// lister's own Vehicles page now lists too. Still vehicles-only, unlike the
// admin search, which also covers user accounts.
export async function GET(request: Request) {
  await requireAdminOrLister();
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const safe = q.replace(/[,()%]/g, " ").trim();
  const supabase = await createClient();

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, name, status")
    .eq("is_deleted", false)
    .or(`name.ilike.%${safe}%,model.ilike.%${safe}%`)
    .limit(8);

  const results: ListerSearchResult[] = (vehicles ?? []).map((vehicle) => ({
    id: vehicle.id,
    title: vehicle.name,
    subtitle: vehicle.status.replaceAll("_", " "),
    href: `/lister/vehicles/${vehicle.id}/edit`,
  }));

  return NextResponse.json({ results });
}
