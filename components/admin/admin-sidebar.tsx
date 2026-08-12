"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronsLeft, ChevronsRight, Search } from "lucide-react";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/nav-items";
import { BrandMark } from "@/components/brand-mark";
import { AdminNavList } from "@/components/admin/admin-nav-list";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminSidebar({ collapsed, onToggleCollapsed }: { collapsed: boolean; onToggleCollapsed: () => void }) {
  const [query, setQuery] = useState("");
  const filteredCount = useMemo(
    () => ADMIN_NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())).length,
    [query]
  );

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-background/80 backdrop-blur-xl transition-[width] duration-200 ease-in-out lg:flex",
        collapsed ? "w-[76px]" : "w-64"
      )}
    >
      <div className={cn("flex h-16 items-center gap-2 border-b border-border px-4", collapsed && "justify-center px-2")}>
        <BrandMark />
        {!collapsed && <span className="truncate text-base font-semibold">Kerala Lease Hub</span>}
      </div>

      {!collapsed && (
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search menu…"
              className="h-8 pl-8 text-xs"
              aria-label="Search sidebar menu"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {query && !collapsed ? (
          <AdminNavListFiltered query={query} />
        ) : (
          <AdminNavList collapsed={collapsed} />
        )}
        {query && !collapsed && filteredCount === 0 ? (
          <p className="mt-2 px-3 text-xs text-muted-foreground">No matching menu items.</p>
        ) : null}
      </div>

      <div className="border-t border-border p-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="w-full"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{collapsed ? "Expand" : "Collapse"}</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}

function AdminNavListFiltered({ query }: { query: string }) {
  const items = ADMIN_NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <nav aria-label="Filtered admin navigation" className="flex flex-col gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground no-underline transition-colors hover:bg-muted hover:text-foreground"
        >
          <item.icon className="size-4.5 shrink-0" />
          <span className="truncate">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
