"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LISTER_NAV_ITEMS } from "@/lib/lister/nav-items";
import { cn } from "@/lib/utils";

const SHORT_LABELS: Record<string, string> = {
  "My Vehicles": "Vehicles",
  "Add Vehicle": "Add",
  "Deleted Listings": "Deleted",
};

export function ListerBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Lister navigation"
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-border bg-background/95 px-1 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {LISTER_NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-muted-foreground no-underline transition-colors",
              active && "bg-muted text-foreground"
            )}
          >
            <item.icon className="size-5" />
            <span className="text-[11px] font-medium leading-none">{SHORT_LABELS[item.label] ?? item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
