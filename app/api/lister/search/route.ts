import { NextResponse } from "next/server";
import { requireAdminOrLister } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export type ListerSearchResult = { id: string; title: string; subtitle: string; href: string };

// Scoped to the caller's own vehicles only — vehicles_select_own RLS
// enforces this regardless, but the explicit .eq below keeps the query
// itself honest about intent (a lister has nothing else to search here,
// unlike the admin search which also covers user accounts).
export async function GET(request: Request) {
  const profile = await requireAdminOrLister();
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const safe = q.replace(/[,()%]/g, " ").trim();
  const supabase = await createClient();

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, name, status")
    .eq("lister_id", profile.id)
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
