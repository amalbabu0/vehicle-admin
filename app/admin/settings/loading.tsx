import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/admin/settings/page.tsx: heading, a 5-tab strip (General/SEO/
// Social/Security/Storage), and the default "General" panel's 3 form
// fields (siteName, logoUrl, faviconUrl).
export default function AdminSettingsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-md" />
        ))}
      </div>

      <div className="glass-surface rounded-(--glass-radius-lg) p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-1 h-3.5 w-56" />
        <div className="mt-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-10 w-full max-w-md rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
