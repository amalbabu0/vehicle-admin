import { requireAdminOrLister } from "@/lib/auth/dal";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export default async function RootPage() {
  // requireAdminOrLister() is the real enforcement (DAL + RLS) — proxy.ts's
  // redirect is only an optimistic UX shortcut, not the security boundary.
  const profile = await requireAdminOrLister();

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="glass-surface glass-specular max-w-md rounded-(--glass-radius-lg) p-8 text-center">
        <h1 className="text-2xl font-semibold">Admin Portal</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Signed in as {profile.full_name ?? "—"} ({profile.role}).
          The dashboard shell lands next.
        </p>
        <form action={logout} className="mt-6">
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}
