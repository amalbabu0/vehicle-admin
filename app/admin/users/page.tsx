import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Users as UsersIcon, Heart } from "lucide-react";
import { getUsersPage } from "@/lib/admin/users-data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { UsersFilters } from "@/components/admin/users-filters";
import { UserRowActions } from "@/components/admin/user-row-actions";

export const metadata: Metadata = { title: "Users" };

const PAGE_SIZE = 20;

type PageProps = { searchParams: Promise<{ search?: string; status?: string; page?: string }> };

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = params.status === "active" || params.status === "suspended" ? params.status : "all";
  const page = Math.max(1, Number(params.page ?? 1));

  const { users, total } = await getUsersPage({ search: params.search, status }, page, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">{total.toLocaleString("en-IN")} public-site account{total === 1 ? "" : "s"}.</p>
      </div>

      <UsersFilters />

      <div className="overflow-hidden rounded-(--glass-radius-lg) border border-border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Favorites</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last sign-in</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <UsersIcon className="size-8" />
                    <p className="text-sm">No users match these filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Link href={`/admin/users/${user.id}`} className="flex items-center gap-3 text-foreground no-underline">
                      <Avatar>
                        <AvatarFallback>{(user.fullName ?? user.email ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{user.fullName ?? "Unnamed user"}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email ?? "—"}</p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.suspended ? "destructive" : "outline"}>{user.suspended ? "Suspended" : "Active"}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm">
                      <Heart className="size-3.5 text-muted-foreground" /> {user.favoritesCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.lastSignInAt ? formatDistanceToNow(new Date(user.lastSignInAt), { addSuffix: true }) : "Never"}
                  </TableCell>
                  <TableCell>
                    <UserRowActions userId={user.id} suspended={user.suspended} />
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
            href={`/admin/users?${new URLSearchParams({ ...params, page: String(Math.max(1, page - 1)) } as Record<string, string>).toString()}`}
            className={`rounded-lg border border-border px-4 py-2 no-underline hover:bg-muted ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
          >
            Previous
          </Link>
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/admin/users?${new URLSearchParams({ ...params, page: String(page + 1) } as Record<string, string>).toString()}`}
            className={`rounded-lg border border-border px-4 py-2 no-underline hover:bg-muted ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
          >
            Next
          </Link>
        </div>
      ) : null}
    </div>
  );
}
