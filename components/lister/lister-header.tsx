"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Monitor, Moon, PlusCircle, Settings, Sun } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { LISTER_NAV_ITEMS } from "@/lib/lister/nav-items";
import type { ListerTheme } from "@/lib/lister/use-lister-theme";
import { ListerMobileNav } from "@/components/lister/lister-mobile-nav";
import { ListerSearch } from "@/components/lister/lister-search";
import { ListerClock } from "@/components/lister/lister-clock";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function usePageTitle() {
  const pathname = usePathname();
  if (pathname.endsWith("/edit")) return "Edit Vehicle";
  const item = LISTER_NAV_ITEMS.find((entry) => pathname === entry.href);
  return item?.label ?? "Kerala Lease Hub";
}

export function ListerHeader({
  profile,
  theme,
  onThemeChange,
}: {
  profile: { fullName: string | null; email: string; avatarUrl: string | null };
  theme: ListerTheme;
  onThemeChange: (theme: ListerTheme) => void;
}) {
  const title = usePageTitle();
  const initial = (profile.fullName ?? profile.email).charAt(0).toUpperCase();
  const [themeExpanded, setThemeExpanded] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur-xl sm:gap-3 sm:px-4">
      <ListerMobileNav />
      <h1 className="min-w-0 flex-1 truncate text-base font-semibold lg:text-lg">{title}</h1>
      <ListerSearch />
      <Link href="/lister/vehicles/add" className="no-underline">
        <Button type="button" variant="outline" size="icon" className="size-11" aria-label="Add vehicle"><PlusCircle className="size-5" /></Button>
      </Link>
      <ListerClock />

      <DropdownMenu onOpenChange={(open) => { if (!open) setThemeExpanded(false); }}>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Open profile menu">
            <Avatar><AvatarImage src={profile.avatarUrl ?? undefined} alt="Your profile" /><AvatarFallback>{initial}</AvatarFallback></Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-[calc(100vw-1.5rem)] max-w-72 p-2">
          <div className="flex flex-col items-center px-3 py-4 text-center">
            <Avatar className="size-16"><AvatarImage src={profile.avatarUrl ?? undefined} alt="Your profile" /><AvatarFallback className="text-xl">{initial}</AvatarFallback></Avatar>
            <p className="mt-3 w-full truncate text-sm font-medium">{profile.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="min-h-10 gap-3 px-3 py-2"
            onSelect={(event) => {
              event.preventDefault();
              setThemeExpanded((open) => !open);
            }}
          >
            {theme === "dark" ? <Moon className="size-4" /> : theme === "light" ? <Sun className="size-4" /> : <Monitor className="size-4" />}
            Theme
            <ChevronDown className={`ml-auto size-4 shrink-0 transition-transform ${themeExpanded ? "rotate-180" : ""}`} />
          </DropdownMenuItem>
          {themeExpanded && (
            <DropdownMenuRadioGroup value={theme} onValueChange={(value) => onThemeChange(value as ListerTheme)} className="flex flex-col gap-0.5 py-0.5 pl-2">
              <DropdownMenuRadioItem value="light" className="min-h-9 gap-3 px-3 py-1.5"><Sun className="size-4" /> Light</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark" className="min-h-9 gap-3 px-3 py-1.5"><Moon className="size-4" /> Dark</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system" className="min-h-9 gap-3 px-3 py-1.5"><Monitor className="size-4" /> System</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          )}
          <DropdownMenuItem asChild className="min-h-10 gap-3 px-3 py-2"><Link href="/lister/settings"><Settings className="size-4" /> Settings</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild variant="destructive" className="min-h-10 gap-3 px-3 py-2">
            <form action={logout} className="w-full"><button type="submit" className="flex w-full items-center gap-2"><LogOut className="size-4" /> Logout</button></form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
