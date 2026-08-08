"use client";

import { ListerSidebar } from "@/components/lister/lister-sidebar";
import { ListerHeader } from "@/components/lister/lister-header";
import { ListerFooter } from "@/components/lister/lister-footer";
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

  return (
    <div className={cn("flex min-h-screen bg-background text-foreground", isDark && "dark")}>
      <ListerSidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed(!collapsed)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <ListerHeader profile={profile} theme={theme} onThemeChange={setTheme} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-3 pb-8 sm:p-6">{children}</div>
          <ListerFooter />
        </main>
      </div>
    </div>
  );
}
