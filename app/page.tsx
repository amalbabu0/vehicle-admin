import { requireAdminOrLister } from "@/lib/auth/dal";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export default async function RootPage() {
  // requireAdminOrLister() is the real enforcement (DAL + RLS) — proxy.ts's
  // redirect is only an optimistic UX shortcut, not the security boundary.
  const profile = await requireAdminOrLister();
  const isAdmin = profile.role === "admin";

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="glass-surface glass-specular w-full max-w-4xl rounded-(--glass-radius-lg) p-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Welcome back</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{isAdmin ? "Admin Home" : "Lister Home"}</h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Signed in as <strong>{profile.full_name ?? "—"}</strong> ({profile.role}).
            </p>
          </div>

          <form action={logout} className="shrink-0">
            <Button type="submit" variant="outline" className="w-full md:w-auto">
              Sign out
            </Button>
          </form>
        </div>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-background/80 p-6 shadow-sm shadow-black/5 backdrop-blur-xl">
            <h2 className="text-xl font-semibold">Your dashboard</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {isAdmin
                ? "Use this portal to manage the platform, review listings, and approve lister activity. Admin accounts can also update global settings and monitor audit logs."
                : "Use this portal to manage your own vehicle listings, respond to enquiries, and keep your listing data up to date. Lister accounts only see actions relevant to their own inventory."}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-background/80 p-6 shadow-sm shadow-black/5 backdrop-blur-xl">
            <h2 className="text-xl font-semibold">Quick start</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              {isAdmin ? (
                <>
                  <li>• Review lister approvals and audit events.</li>
                  <li>• Manage site-wide settings and admin email allowlist.</li>
                  <li>• Monitor pending listings and platform health.</li>
                </>
              ) : (
                <>
                  <li>• Add or update your vehicle listings.</li>
                  <li>• Respond to buyer enquiries quickly.</li>
                  <li>• Keep your profile and contact information current.</li>
                </>
              )}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
