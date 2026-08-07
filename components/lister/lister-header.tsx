"use client";

import { usePathname } from "next/navigation";
import { Bell, ChevronDown, LogOut, XCircle } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { LISTER_NAV_ITEMS } from "@/lib/lister/nav-items";
import { ListerMobileNav } from "@/components/lister/lister-mobile-nav";
import { ListerThemeToggle } from "@/components/lister/lister-theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function usePageTitle() {
  const pathname = usePathname();
  if (pathname.endsWith("/edit")) return "Edit Vehicle";
  // Exact match only — same "/lister/vehicles" vs "/lister/vehicles/add"
  // prefix-collision reasoning as lister-nav-list.tsx.
  const item = LISTER_NAV_ITEMS.find((entry) => pathname === entry.href);
  return item?.label ?? "Kerala Lease Hub";
}

export function ListerHeader({
  profile,
  rejectedListings,
  dark,
  onToggleDark,
}: {
  profile: { fullName: string | null; email: string };
  rejectedListings: { id: string; name: string }[];
  dark: boolean;
  onToggleDark: () => void;
}) {
  const title = usePageTitle();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-3 backdrop-blur-xl sm:px-4">
      <ListerMobileNav />
      <h1 className="min-w-0 flex-1 truncate text-base font-semibold lg:text-lg">{title}</h1>

      <ListerThemeToggle dark={dark} onToggle={onToggleDark} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="relative size-11" aria-label="Notifications">
            <Bell className="size-5" />
            {rejectedListings.length > 0 ? (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 h-4.5 min-w-4.5 justify-center rounded-full px-1 text-[10px]"
              >
                {rejectedListings.length > 9 ? "9+" : rejectedListings.length}
              </Badge>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {rejectedListings.length > 0 ? (
            rejectedListings.map((vehicle) => (
              <DropdownMenuItem key={vehicle.id} variant="destructive" className="items-start">
                <XCircle className="mt-0.5 size-4 shrink-0" />
                <span className="truncate">&ldquo;{vehicle.name}&rdquo; was rejected</span>
              </DropdownMenuItem>
            ))
          ) : (
            <p className="px-2 py-3 text-sm text-muted-foreground">You&apos;re all caught up.</p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex size-11 items-center justify-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Profile menu">
            <Avatar>
              <AvatarFallback>{(profile.fullName ?? profile.email).charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <p className="truncate">{profile.fullName ?? profile.email}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">Lister</p>
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
