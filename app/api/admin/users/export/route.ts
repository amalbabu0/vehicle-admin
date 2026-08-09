import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/dal";
import { getUsersPage } from "@/lib/admin/users-data";
import { toCsvField } from "@/lib/csv";

export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? undefined;
  const status = (url.searchParams.get("status") as "all" | "active" | "suspended" | null) ?? "all";

  const { users } = await getUsersPage({ search, status }, 1, 500);

  const header = ["Name", "Email", "Phone", "Status", "Favorites", "Joined", "Last sign-in"];
  const lines = [header.map(toCsvField).join(",")];
  for (const user of users) {
    lines.push(
      [
        user.fullName ?? "",
        user.email ?? "",
        user.phone ?? "",
        user.suspended ? "Suspended" : "Active",
        user.favoritesCount,
        new Date(user.createdAt).toISOString(),
        user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : "",
      ]
        .map(toCsvField)
        .join(",")
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="users-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
