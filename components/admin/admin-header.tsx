"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, LogOut, Plus, ClipboardCheck, ShieldAlert } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/nav-items";
import type { LoginAttackAlert } from "@/lib/admin/security-data";
import { AdminSearch } from "@/components/admin/admin-search";
import { AdminClock } from "@/components/admin/admin-clock";
import { AdminThemeToggle } from "@/components/admin/admin-theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function useBreadcrumbs() {
  const pathname = usePathname();
  const current = ADMIN_NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return current;
}

export function AdminHeader({
  profile,
  pendingApprovalCount,
  securityAlerts,
  dark,
  onToggleDark,
}: {
  profile: { fullName: string | null; role: string; email: string };
  pendingApprovalCount: number;
  securityAlerts: LoginAttackAlert[];
  dark: boolean;
  onToggleDark: () => void;
}) {
  const current = useBreadcrumbs();
  const notificationCount = pendingApprovalCount + securityAlerts.length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <Breadcrumb className="hidden lg:block">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/dashboard">Admin</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {current ? (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{current.label}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : null}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <AdminSearch />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="relative rounded-full" aria-label="Quick actions">
              <Plus className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/vehicles/add">
                <Plus className="size-4" /> Add vehicle
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/listings?status=pending_approval">
                <ClipboardCheck className="size-4" /> Review pending listings
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="relative rounded-full" aria-label="Notifications">
              <Bell className="size-4" />
              {notificationCount > 0 ? (
                <Badge
                  variant={securityAlerts.length > 0 ? "destructive" : "default"}
                  className="absolute -right-1.5 -top-1.5 h-4.5 min-w-4.5 justify-center rounded-full px-1 text-[10px]"
                >
                  {notificationCount > 99 ? "99+" : notificationCount}
                </Badge>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {securityAlerts.length > 0
              ? securityAlerts.map((alert) => (
                  <DropdownMenuItem key={alert.ip} asChild variant="destructive">
                    <Link href="/admin/activity-logs?action=login_failed">
                      <ShieldAlert className="size-4" />
                      <span className="truncate">
                        {alert.attemptCount} failed logins from {alert.ip}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))
              : null}
            {pendingApprovalCount > 0 ? (
              <DropdownMenuItem asChild>
                <Link href="/admin/listings?status=pending_approval">
                  <ClipboardCheck className="size-4" />
                  {pendingApprovalCount} listing{pendingApprovalCount === 1 ? "" : "s"} awaiting approval
                </Link>
              </DropdownMenuItem>
            ) : null}
            {notificationCount === 0 ? <p className="px-2 py-3 text-sm text-muted-foreground">You&apos;re all caught up.</p> : null}
          </DropdownMenuContent>
        </DropdownMenu>

        <AdminClock />
        <AdminThemeToggle dark={dark} onToggle={onToggleDark} />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="order-first flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring lg:order-none"
            aria-label="Admin profile menu"
          >
            <Avatar>
              <AvatarFallback>{(profile.fullName ?? profile.email).charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <p className="truncate">{profile.fullName ?? profile.email}</p>
            <p className="truncate text-xs font-normal capitalize text-muted-foreground">{profile.role}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild variant="destructive">
            <form action={logout} className="w-full">
              <button type="submit" className="flex w-full items-center gap-2">
                <LogOut className="size-4" /> Sign out
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
