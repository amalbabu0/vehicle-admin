"use client";

import { ListerSidebar } from "@/components/lister/lister-sidebar";
import { ListerHeader } from "@/components/lister/lister-header";
import { ListerFooter } from "@/components/lister/lister-footer";
import { useLocalStorageBoolean } from "@/lib/lister/use-local-storage-boolean";
import { cn } from "@/lib/utils";

export function ListerShell({
  profile,
  children,
}: {
  profile: { fullName: string | null; email: string };
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useLocalStorageBoolean("lister:sidebar-collapsed", false);
  const [dark, setDark] = useLocalStorageBoolean("lister:dark-mode", false);

  return (
    <div className={cn("flex min-h-screen bg-background text-foreground", dark && "dark")}>
      <ListerSidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed(!collapsed)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <ListerHeader profile={profile} dark={dark} onToggleDark={() => setDark(!dark)} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-3 pb-8 sm:p-6">{children}</div>
          <ListerFooter />
        </main>
      </div>
    </div>
  );
}
