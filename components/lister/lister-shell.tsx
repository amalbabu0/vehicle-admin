"use client";

import { ListerSidebar } from "@/components/lister/lister-sidebar";
import { ListerHeader } from "@/components/lister/lister-header";
import { useLocalStorageBoolean } from "@/lib/lister/use-local-storage-boolean";

export function ListerShell({
  profile,
  rejectedListings,
  children,
}: {
  profile: { fullName: string | null; email: string };
  rejectedListings: { id: string; name: string }[];
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useLocalStorageBoolean("lister:sidebar-collapsed", false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <ListerSidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed(!collapsed)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <ListerHeader profile={profile} rejectedListings={rejectedListings} />
        <main className="flex-1 overflow-y-auto p-3 pb-8 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
