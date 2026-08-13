import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { ShieldOff } from "lucide-react";
import { getBlockedIpsPage } from "@/lib/admin/blocked-ips-data";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { BlockIpButton } from "@/components/admin/block-ip-button";

export const metadata: Metadata = { title: "Blocked IPs" };
export const revalidate = 0;

const PAGE_SIZE = 25;

type PageProps = { searchParams: Promise<{ page?: string }> };

export default async function AdminBlockedIpsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));

  const { blocks, total, activeCount } = await getBlockedIpsPage(page, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Blocked IPs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeCount.toLocaleString("en-IN")} address{activeCount === 1 ? "" : "es"} currently denied access
          {total > activeCount ? `, and ${(total - activeCount).toLocaleString("en-IN")} lapsed` : ""}. Changes take
          up to a minute to reach the public site.
        </p>
      </div>

      <div className="overflow-x-auto rounded-(--glass-radius-lg) border border-border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead>IP</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Blocked</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>By</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blocks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ShieldOff className="size-8" />
                    <p className="text-sm">No addresses have been blocked.</p>
                    <p className="text-xs">Block one from the IP Logs page when a visitor looks like a threat.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              blocks.map((block) => (
                <TableRow key={block.ip} className={block.isActive ? undefined : "opacity-60"}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">{block.ip}</TableCell>
                  <TableCell>
                    <Badge variant={block.isActive ? "destructive" : "secondary"}>
                      {block.isActive ? "Active" : "Lapsed"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[16rem] truncate text-xs text-muted-foreground">
                    {block.reason ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    <span title={format(new Date(block.createdAt), "PPpp")}>
                      {formatDistanceToNow(new Date(block.createdAt), { addSuffix: true })}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {block.expiresAt === null ? (
                      <span className="font-medium text-foreground">Never</span>
                    ) : (
                      <span title={format(new Date(block.expiresAt), "PPpp")}>
                        {formatDistanceToNow(new Date(block.expiresAt), { addSuffix: true })}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {block.blockedByName ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <BlockIpButton ip={block.ip} blocked unblockLabel={block.isActive ? "Unblock" : "Remove"} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <Link
            href={`/admin/blocked-ips?page=${Math.max(1, page - 1)}`}
            className={`rounded-lg border border-border px-4 py-2 no-underline hover:bg-muted ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
          >
            Previous
          </Link>
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/admin/blocked-ips?page=${page + 1}`}
            className={`rounded-lg border border-border px-4 py-2 no-underline hover:bg-muted ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
          >
            Next
          </Link>
        </div>
      ) : null}
    </div>
  );
}
