"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, LayoutDashboard, MoreHorizontal, Users } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { AdminNavList } from "@/components/admin/admin-nav-list";
import { cn } from "@/lib/utils";

// Only 3 of the 8 ADMIN_NAV_ITEMS fit a bottom bar without crowding — the
// rest (Analytics, Activity Logs, Reviews, Deleted Listings, Settings) live
// behind "More", which reuses the same AdminNavList as the old hamburger
// drawer did.
const PRIMARY_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Listers", href: "/admin/listings", icon: Car },
  { label: "Users", href: "/admin/users", icon: Users },
];

export function AdminBottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav
      aria-label="Admin navigation"
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-border bg-background/95 px-1 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {PRIMARY_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
            <span className="text-[11px] font-medium leading-none">{item.label}</span>
          </Link>
        );
      })}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="More admin sections"
            className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-muted-foreground transition-colors"
          >
            <MoreHorizontal className="size-5" />
            <span className="text-[11px] font-medium leading-none">More</span>
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="flex items-center gap-2 border-b border-border px-4 py-4">
            <Car className="size-5 text-primary" /> Kerala Lease Hub
          </SheetTitle>
          <div className="p-3">
            <AdminNavList onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
