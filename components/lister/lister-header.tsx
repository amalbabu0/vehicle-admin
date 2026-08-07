"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, PlusCircle } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { LISTER_NAV_ITEMS } from "@/lib/lister/nav-items";
import { ListerMobileNav } from "@/components/lister/lister-mobile-nav";
import { ListerThemeToggle } from "@/components/lister/lister-theme-toggle";
import { ListerSearch } from "@/components/lister/lister-search";
import { ListerClock } from "@/components/lister/lister-clock";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  dark,
  onToggleDark,
}: {
  profile: { fullName: string | null; email: string };
  dark: boolean;
  onToggleDark: () => void;
}) {
  const title = usePageTitle();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur-xl sm:gap-3 sm:px-4">
      <ListerMobileNav />
      <h1 className="min-w-0 flex-1 truncate text-base font-semibold lg:text-lg">{title}</h1>

      <ListerSearch />

      <Link href="/lister/vehicles/add" className="no-underline">
        <Button type="button" variant="outline" size="icon" className="size-11" aria-label="Add vehicle">
          <PlusCircle className="size-5" />
        </Button>
      </Link>

      <ListerClock />
      <ListerThemeToggle dark={dark} onToggle={onToggleDark} />

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
