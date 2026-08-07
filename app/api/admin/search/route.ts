import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export type AdminSearchResult = { type: "vehicle" | "user"; id: string; title: string; subtitle: string; href: string };

export async function GET(request: Request) {
  await requireAdmin();
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const safe = q.replace(/[,()%]/g, " ").trim();
  const supabase = await createClient();

  const [{ data: vehicles }, { data: users }] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, name, slug, status")
      .or(`name.ilike.%${safe}%,model.ilike.%${safe}%`)
      .limit(5),
    supabase
      .from("user_profiles")
      .select("id, full_name")
      .ilike("full_name", `%${safe}%`)
      .limit(5),
  ]);

  const results: AdminSearchResult[] = [
    ...(vehicles ?? []).map((vehicle) => ({
      type: "vehicle" as const,
      id: vehicle.id,
      title: vehicle.name,
      subtitle: `Listing — ${vehicle.status.replaceAll("_", " ")}`,
      href: `/vehicles`,
    })),
    ...(users ?? []).map((user) => ({
      type: "user" as const,
      id: user.id,
      title: user.full_name ?? "Unnamed user",
      subtitle: "User account",
      href: `/admin/users`,
    })),
  ];

  return NextResponse.json({ results });
}
