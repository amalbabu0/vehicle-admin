import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { History, ShieldAlert } from "lucide-react";
import { getActivityLogsPage, getActorOptions } from "@/lib/admin/activity-logs-data";
import { getLoginAttackAlerts } from "@/lib/admin/security-data";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ActivityLogsFilters } from "@/components/admin/activity-logs-filters";

export const metadata: Metadata = { title: "Activity Logs" };
export const revalidate = 0;

const PAGE_SIZE = 25;

type PageProps = {
  searchParams: Promise<{ search?: string; action?: string; entityType?: string; actorId?: string; from?: string; to?: string; page?: string }>;
};

function entityHref(entityType: string, entityId: string | null): string | null {
  if (!entityId) return null;
  if (entityType === "user") return `/admin/users/${entityId}`;
  if (entityType === "vehicle") return `/admin/listings?search=${entityId}`;
  return null;
}

export default async function AdminActivityLogsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const filter = {
    search: params.search,
    action: params.action,
    entityType: params.entityType,
    actorId: params.actorId,
    from: params.from,
    to: params.to,
  };

  const [{ logs, total }, actors, attackAlerts] = await Promise.all([
    getActivityLogsPage(filter, page, PAGE_SIZE),
    getActorOptions(),
    getLoginAttackAlerts(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Activity Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">{total.toLocaleString("en-IN")} logged admin action{total === 1 ? "" : "s"}.</p>
      </div>

      {attackAlerts.length > 0 ? (
        <div className="rounded-(--glass-radius-lg) border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4.5 text-destructive" />
            <h3 className="text-sm font-semibold text-destructive">Possible brute-force activity</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">3+ failed logins from the same IP in the last 15 minutes.</p>
          <ul className="mt-3 space-y-2">
            {attackAlerts.map((alert) => (
              <li key={alert.ip} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/20 bg-background px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{alert.attemptCount} attempts</span> from <span className="font-mono">{alert.ip}</span>
                  {alert.emails.length > 0 ? <span className="text-muted-foreground"> — tried {alert.emails.join(", ")}</span> : null}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  last {formatDistanceToNow(new Date(alert.lastAttemptAt), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ActivityLogsFilters actors={actors} />

      <div className="overflow-x-auto rounded-(--glass-radius-lg) border border-border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <History className="size-8" />
                    <p className="text-sm">No activity matches these filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const href = entityHref(log.entityType, log.entityId);
                const isFailedLogin = log.action === "login_failed";
                const meta = log.metadata as { email?: string; ip?: string; reason?: string };
                const detailsText = isFailedLogin
                  ? [meta.email, meta.reason?.replaceAll("_", " ")].filter(Boolean).join(" — ")
                  : Object.keys(log.metadata).length > 0
                    ? JSON.stringify(log.metadata)
                    : null;
                return (
                  <TableRow key={log.id} className={isFailedLogin ? "bg-destructive/5" : undefined}>
                    <TableCell className="whitespace-nowrap text-sm font-medium">
                      {isFailedLogin ? <span className="font-mono text-xs">{meta.ip ?? "unknown"}</span> : (log.actorName ?? "System")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isFailedLogin ? "destructive" : "outline"} className="capitalize">
                        {log.action.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {href ? (
                        <Link href={href} className="capitalize text-foreground underline">
                          {log.entityType}
                        </Link>
                      ) : (
                        <span className="capitalize text-muted-foreground">{log.entityType}</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{detailsText ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <Link
            href={`/admin/activity-logs?${new URLSearchParams({ ...params, page: String(Math.max(1, page - 1)) } as Record<string, string>).toString()}`}
            className={`rounded-lg border border-border px-4 py-2 no-underline hover:bg-muted ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
          >
            Previous
          </Link>
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/admin/activity-logs?${new URLSearchParams({ ...params, page: String(page + 1) } as Record<string, string>).toString()}`}
            className={`rounded-lg border border-border px-4 py-2 no-underline hover:bg-muted ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
          >
            Next
          </Link>
        </div>
      ) : null}
    </div>
  );
}
