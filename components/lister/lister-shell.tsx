"use client";

import { useEffect } from "react";
import { ListerSidebar } from "@/components/lister/lister-sidebar";
import { ListerHeader } from "@/components/lister/lister-header";
import { ListerFooter } from "@/components/lister/lister-footer";
import { ListerBottomNav } from "@/components/lister/lister-bottom-nav";
import { useLocalStorageBoolean } from "@/lib/lister/use-local-storage-boolean";
import { useListerTheme } from "@/lib/lister/use-lister-theme";
import { cn } from "@/lib/utils";

export function ListerShell({
  profile,
  children,
}: {
  profile: { fullName: string | null; email: string; avatarUrl: string | null };
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useLocalStorageBoolean("lister:sidebar-collapsed", false);
  const { theme, setTheme, isDark } = useListerTheme();

  // Radix Popover/DropdownMenu/Command content renders in a portal appended
  // to document.body — a sibling of this component's own tree, not a
  // descendant. The `dark` class below only affects this div's subtree, so
  // portaled content (the lease-period combobox, brand combobox, profile
  // menu, etc.) never saw it and rendered with light-theme CSS variables.
  // Toggling the class on <html> instead makes it visible to portals too.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, [isDark]);

  return (
    <div className={cn("flex min-h-screen bg-background text-foreground", isDark && "dark")}>
      <ListerSidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed(!collapsed)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <ListerHeader profile={profile} theme={theme} onThemeChange={setTheme} />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="p-3 pb-8 sm:p-6">{children}</div>
          <ListerFooter />
        </main>
      </div>
      <ListerBottomNav />
    </div>
  );
}
