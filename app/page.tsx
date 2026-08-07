import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminOrLister } from "@/lib/auth/dal";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export default async function RootPage() {
  // requireAdminOrLister() is the real enforcement (DAL + RLS) — proxy.ts's
  // redirect is only an optimistic UX shortcut, not the security boundary.
  const profile = await requireAdminOrLister();

  // Admins get the real dashboard at /admin/dashboard — this page is the
  // lister-only landing page now. It used to render admin content inline
  // too (with static placeholder numbers), but that predates the admin
  // dashboard build and was never wired to real data.
  if (profile.role === "admin") {
    redirect("/admin/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="glass-surface glass-specular w-full max-w-6xl rounded-(--glass-radius-lg) p-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Welcome back</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Lister Home</h1>
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

        <div className="mt-8 rounded-xl border border-border bg-background/80 p-6 shadow-sm shadow-black/5 backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Vehicle inventory</p>
              <h2 className="mt-2 text-xl font-semibold">Browse your vehicle listings</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Open the vehicle listing page to view active, draft, and sold listings available to your role.
              </p>
            </div>
            <Link href="/vehicles" className="mt-3 md:mt-0">
              <Button>View all vehicle listings</Button>
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-xl border border-border bg-background/80 p-6 shadow-sm shadow-black/5 backdrop-blur-xl">
            <h2 className="text-xl font-semibold">Lister dashboard overview</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              This portal is your lister workspace. Manage your own listings, enquiries, and analytics without access to other listers&apos; data
              or admin-only functions.
            </p>

            <div className="mt-6 rounded-xl border border-border bg-muted/5 p-4 text-sm text-muted-foreground">
              <p className="font-medium">Lister permissions</p>
              <ul className="mt-3 list-inside list-disc space-y-2">
                <li>Create and manage only your own listings.</li>
                <li>Reply to customer enquiries and view linked vehicles.</li>
                <li>See analytics only for your own inventory.</li>
                <li>Cannot access admin settings or other listers&apos; data.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/80 p-6 shadow-sm shadow-black/5 backdrop-blur-xl">
            <h2 className="text-xl font-semibold">Dashboard essentials</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              <li>• Total Active Listings</li>
              <li>• Draft Listings</li>
              <li>• Sold Vehicles</li>
              <li>• Total Views, Enquiries, and Favorites</li>
              <li>• Unread Messages and Recent Activity</li>
              <li>• Listing Performance and Quick Actions</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-border bg-background/80 p-6 shadow-sm shadow-black/5 backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Analytics</p>
              <h2 className="mt-2 text-2xl font-semibold">Platform insights</h2>
            </div>
            <div className="inline-flex items-center rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground">
              Last updated just now
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border bg-white/80 p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Total Active Listings</p>
              <p className="mt-2 text-3xl font-semibold">82</p>
            </div>
            <div className="rounded-xl border border-border bg-white/80 p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Draft Listings</p>
              <p className="mt-2 text-3xl font-semibold">18</p>
            </div>
            <div className="rounded-xl border border-border bg-white/80 p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Sold Vehicles</p>
              <p className="mt-2 text-3xl font-semibold">24</p>
            </div>
            <div className="rounded-xl border border-border bg-white/80 p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Total Enquiries</p>
              <p className="mt-2 text-3xl font-semibold">146</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-white/80 p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Total Views</p>
              <p className="mt-2 text-3xl font-semibold">7.2k</p>
            </div>
            <div className="rounded-xl border border-border bg-white/80 p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Unread Messages</p>
              <p className="mt-2 text-3xl font-semibold">12</p>
            </div>
            <div className="rounded-xl border border-border bg-white/80 p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Favorites Count</p>
              <p className="mt-2 text-3xl font-semibold">53</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-white/80 p-4 shadow-sm">
              <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">Listing performance</p>
              <p className="mt-3 text-sm text-muted-foreground">Top vehicle: Maruti Alto 2018 — 1.4k views, 28 enquiries.</p>
            </div>
            <div className="rounded-xl border border-border bg-white/80 p-4 shadow-sm">
              <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">Recent activity</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• New enquiry on Supreme Innova</li>
                <li>• Listing &ldquo;BMW 5 Series&rdquo; marked sold</li>
                <li>• Draft &ldquo;Toyota Fortuner&rdquo; updated</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-background/80 p-6 shadow-sm shadow-black/5 backdrop-blur-xl">
            <h3 className="text-lg font-semibold">Vehicle management</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Create and manage your lease/sale listings with the fields needed for your business.
            </p>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
              <li>• Manual Listing: type, brand, year, price/lease, owner, location, contact, service charge, description, images.</li>
              <li>• Quick Listing: paste WhatsApp ads, auto-extract details, review, upload images, publish.</li>
              <li>• Save drafts, publish, archive, restore, duplicate, mark sold, and preview your listings.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-background/80 p-6 shadow-sm shadow-black/5 backdrop-blur-xl">
            <h3 className="text-lg font-semibold">Communication & analytics</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Keep enquiries and listings organised while tracking performance for your own inventory.
            </p>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
              <li>• View all enquiries, reply to customers, and manage conversations.</li>
              <li>• Mark messages read, archive conversations, and close enquiries.</li>
              <li>• Track views, enquiries, favorites, listing age, and status.</li>
              <li>• Search and filter your listings by name, status, brand, type, views, and enquiries.</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
