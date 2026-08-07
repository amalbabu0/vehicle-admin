"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { useLocalStorageBoolean } from "@/lib/admin/use-local-storage-boolean";
import { cn } from "@/lib/utils";

export function AdminShell({
  profile,
  pendingApprovalCount,
  children,
}: {
  profile: { fullName: string | null; role: string; email: string };
  pendingApprovalCount: number;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useLocalStorageBoolean("admin:sidebar-collapsed", false);
  const [dark, setDark] = useLocalStorageBoolean("admin:dark-mode", false);

  return (
    <div className={cn("bg-background text-foreground", dark && "dark")}>
      <div className="flex min-h-screen">
        <AdminSidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed(!collapsed)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminHeader profile={profile} pendingApprovalCount={pendingApprovalCount} dark={dark} onToggleDark={() => setDark(!dark)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
