"use client";

import { Car, ChevronsLeft, ChevronsRight } from "lucide-react";
import { ListerNavList } from "@/components/lister/lister-nav-list";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ListerSidebar({ collapsed, onToggleCollapsed }: { collapsed: boolean; onToggleCollapsed: () => void }) {
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-background/80 backdrop-blur-xl transition-[width] duration-200 ease-in-out lg:flex",
        collapsed ? "w-[76px]" : "w-64"
      )}
    >
      <div className={cn("flex h-16 items-center gap-2 border-b border-border px-4", collapsed && "justify-center px-2")}>
        <Car className="size-6 shrink-0 text-primary" />
        {!collapsed && <span className="truncate text-base font-semibold">Kerala Lease Hub</span>}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <ListerNavList collapsed={collapsed} />
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
