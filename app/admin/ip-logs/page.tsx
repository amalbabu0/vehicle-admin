import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { Globe } from "lucide-react";
import { getBlockedIps, getVisitorLogsPage, getVisitorStats, UNIQUE_IP_SAMPLE_CAP } from "@/lib/admin/ip-logs-data";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { IpLogsFilters } from "@/components/admin/ip-logs-filters";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { BlockIpButton } from "@/components/admin/block-ip-button";

export const metadata: Metadata = { title: "IP Logs" };
export const revalidate = 0;

const PAGE_SIZE = 25;

type PageProps = {
  searchParams: Promise<{ search?: string; from?: string; to?: string; page?: string }>;
};

export default async function AdminIpLogsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const filter = { search: params.search, from: params.from, to: params.to };

  const [{ logs, total }, stats] = await Promise.all([
    getVisitorLogsPage(filter, page, PAGE_SIZE),
    getVisitorStats(),
  ]);
  // Sequential rather than in the Promise.all above: it needs the page's rows
  // to know which addresses to ask about.
  const blockedIps = await getBlockedIps(logs.map((log) => log.ip));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const uniqueCapped = stats.visitsToday > UNIQUE_IP_SAMPLE_CAP;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">IP Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every visit to the public site, signed in or not — {total.toLocaleString("en-IN")} recorded visit
            {total === 1 ? "" : "s"}. Entries are permanently deleted after 24 hours.
          </p>
        </div>
        <AutoRefresh />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-(--glass-radius-lg) border border-border p-5">
          <p className="text-sm text-muted-foreground">Visits — last 24 hours</p>
          <p className="mt-1 text-2xl font-semibold">{stats.visitsToday.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-(--glass-radius-lg) border border-border p-5">
          <p className="text-sm text-muted-foreground">Unique IPs — last 24 hours</p>
          <p className="mt-1 text-2xl font-semibold">
            {uniqueCapped ? "≥ " : ""}
            {stats.uniqueIpsToday.toLocaleString("en-IN")}
          </p>
          {uniqueCapped ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Counted over the most recent {UNIQUE_IP_SAMPLE_CAP.toLocaleString("en-IN")} visits.
            </p>
          ) : null}
        </div>
      </div>

      <IpLogsFilters />

      <div className="overflow-x-auto rounded-(--glass-radius-lg) border border-border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead>IP</TableHead>
              <TableHead>Page</TableHead>
              <TableHead>Visitor</TableHead>
              <TableHead>Referrer</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>When</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Globe className="size-8" />
                    <p className="text-sm">No visits match these filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const isBlocked = blockedIps.has(log.ip);
                return (
                <TableRow key={log.id} className={isBlocked ? "bg-destructive/5" : undefined}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {log.ip}
                    {log.country ? <span className="ml-2 text-muted-foreground">{log.country}</span> : null}
                    {isBlocked ? <Badge variant="destructive" className="ml-2">Blocked</Badge> : null}
                  </TableCell>
                  <TableCell className="max-w-[16rem] truncate text-sm">{log.path}</TableCell>
                  <TableCell>
                    <Badge variant={log.isAuthenticated ? "outline" : "secondary"}>
                      {log.isAuthenticated ? "Signed in" : "Guest"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[14rem] truncate text-xs text-muted-foreground">
                    {log.referrer ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[16rem] truncate text-xs text-muted-foreground">
                    {log.userAgent ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    <span title={format(new Date(log.createdAt), "PPpp")}>
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {log.ip === "unknown" ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <BlockIpButton ip={log.ip} blocked={isBlocked} />
                    )}
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
            href={`/admin/ip-logs?${new URLSearchParams({ ...params, page: String(Math.max(1, page - 1)) } as Record<string, string>).toString()}`}
            className={`rounded-lg border border-border px-4 py-2 no-underline hover:bg-muted ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
          >
            Previous
          </Link>
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/admin/ip-logs?${new URLSearchParams({ ...params, page: String(page + 1) } as Record<string, string>).toString()}`}
            className={`rounded-lg border border-border px-4 py-2 no-underline hover:bg-muted ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
          >
            Next
          </Link>
        </div>
      ) : null}
    </div>
  );
}
