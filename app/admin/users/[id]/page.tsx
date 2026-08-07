import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { ArrowLeft, Mail, Phone, Calendar, Clock } from "lucide-react";
import { getUserById, getUserFavoriteVehicles } from "@/lib/admin/users-data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserRowActions } from "@/components/admin/user-row-actions";

export const metadata: Metadata = { title: "User profile" };

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getUserById(id);
  if (!user) notFound();

  const favorites = await getUserFavoriteVehicles(id);

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to users
      </Link>

      <div className="glass-surface glass-specular rounded-(--glass-radius-lg) p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarFallback className="text-lg">{(user.fullName ?? user.email ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-semibold">{user.fullName ?? "Unnamed user"}</h1>
              <Badge variant={user.suspended ? "destructive" : "outline"} className="mt-1">
                {user.suspended ? "Suspended" : "Active"}
              </Badge>
            </div>
          </div>
          <UserRowActions userId={user.id} suspended={user.suspended} />
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
              <Mail className="size-3.5" /> Email
            </dt>
            <dd className="mt-1 truncate text-sm font-medium">{user.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
              <Phone className="size-3.5" /> Phone
            </dt>
            <dd className="mt-1 text-sm font-medium">{user.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
              <Calendar className="size-3.5" /> Joined
            </dt>
            <dd className="mt-1 text-sm font-medium">{format(new Date(user.createdAt), "d MMM yyyy")}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
              <Clock className="size-3.5" /> Last sign-in
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {user.lastSignInAt ? formatDistanceToNow(new Date(user.lastSignInAt), { addSuffix: true }) : "Never"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="glass-surface rounded-(--glass-radius-lg) p-6">
        <h2 className="text-sm font-semibold">Favorited vehicles ({favorites.length})</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Public-site accounts don&apos;t own listings — this is the closest real per-user vehicle relationship.
        </p>
        {favorites.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No favorites yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {favorites.map((vehicle) => (
              <li key={vehicle.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                <span className="truncate">{vehicle.name}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {vehicle.status.replaceAll("_", " ")}
                  </Badge>
                  <span className="text-muted-foreground">₹{vehicle.leaseAmount.toLocaleString("en-IN")}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link href="/admin/users" className="no-underline">
        <Button variant="outline">Back to all users</Button>
      </Link>
    </div>
  );
}
