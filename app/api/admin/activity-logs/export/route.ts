import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/dal";
import { getActivityLogsPage } from "@/lib/admin/activity-logs-data";
import { toCsvField } from "@/lib/csv";

export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const filter = {
    search: url.searchParams.get("search") ?? undefined,
    action: url.searchParams.get("action") ?? undefined,
    entityType: url.searchParams.get("entityType") ?? undefined,
    actorId: url.searchParams.get("actorId") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  };

  const { logs } = await getActivityLogsPage(filter, 1, 1000);

  const header = ["Timestamp", "Admin", "Action", "Entity type", "Entity ID", "Metadata"];
  const lines = [header.map(toCsvField).join(",")];
  for (const log of logs) {
    lines.push(
      [
        new Date(log.createdAt).toISOString(),
        log.actorName ?? "",
        log.action,
        log.entityType,
        log.entityId ?? "",
        JSON.stringify(log.metadata),
      ]
        .map(toCsvField)
        .join(",")
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="activity-logs-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
