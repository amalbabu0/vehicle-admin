# Architecture

## The shape of the system

Three actors, two apps, one database.

```
                    ┌─────────────────────┐
   Many viewers ──▶ │   USER APP           │ ── read listings ──┐
                    │   (Vercel project)   │                    │
                    │   Next.js / Astro    │ ◀─ create inquiry ─┤
                    └─────────────────────┘                    │
                                                                 ▼
                                                        ┌────────────────┐
                                                        │   SUPABASE     │
                                                        │   PostgreSQL   │
                                                        │   + Auth       │
                                                        └────────────────┘
                                                                 ▲
                    ┌─────────────────────┐                    │
   You + lister ──▶ │   ADMIN APP          │ ── read/write ─────┘
   (2 accounts)     │   (Vercel project)   │    inventory
                    │   Next.js            │
                    └─────────────────────┘

   Vehicle photos:  Cloudflare R2 (storage) ──▶ Cloudflare CDN ──▶ browsers
```

## Why two apps instead of one

The two apps serve different audiences, run different code, deploy on different
schedules, and — importantly — need **different levels of database access**. Splitting
by audience lets the public app run with a restricted footprint while the admin app
holds the privileged operations. It mirrors the dealership pattern: a fast public
storefront and a separate back-office tool that only staff touch.

This is a split by **audience**, not by frontend-vs-backend. See "Repo & deployment
topology" below for why that difference matters.

## Why a modular monolith, not microservices

Microservices earn their keep in exactly three situations, none of which apply here:

1. **Multiple teams** needing independent deploys — you are one developer.
2. **Components that scale very differently** — the app is uniformly read-heavy, and a CDN absorbs the read load anyway.
3. **Different languages per component** — it's all one language.

Splitting into services would add separate deployments, cross-service network calls,
auth token-passing across boundaries, distributed debugging, and more infrastructure
to pay for — all for zero benefit at this size. **Splitting one app into several small
apps does not increase how much traffic you can handle.** Capacity comes from running
more copies behind a load balancer (horizontal scaling) and from caching — both of
which a plain monolith does. Shopify, GitHub, and Stack Overflow all served huge
audiences as essentially monoliths.

**The approach:** each app is one deployable unit, organized cleanly into modules
inside. You get tidy separation without the pain of distributing it across a network.

### Modules inside the user app

- **Auth** — register, log in, log out, sessions (handled by Supabase Auth)
- **Catalog / browse** — list vehicles, apply filters, sorting, pagination (main read path)
- **Vehicle detail** — single-vehicle page with specs, photos, and the contact affordance
- **Inquiry / contact** — the one place the public app *writes*: a message to the owner
- **Favorites** *(optional)* — save/unsave listings; only needed if viewers want it

All of these live as folders / route-groups inside one app.

### The one piece that legitimately runs separately

Sending the **notification/email when an inquiry arrives** should not block the user's
request, and email delivery can fail and need retrying on its own. But this is a
**background job or small serverless function**, not a microservice. Start it as a
background task; only formalize it if volume grows.

## Data model

Core tables (Supabase / PostgreSQL):

### `profiles`
Extends Supabase Auth's `auth.users`. One row per account.

| Column | Notes |
|--------|-------|
| `id` | FK to `auth.users.id` |
| `role` | `user` \| `lister` \| `admin` — drives RLS policies |
| `display_name`, `created_at` | |

### `vehicles`
The listings.

| Column | Notes |
|--------|-------|
| `id` | primary key |
| `make`, `model`, `year` | |
| `price`, `mileage` | |
| `fuel_type`, `transmission`, `condition` | |
| `location` | for location-based filtering |
| `description` | |
| `status` | `draft` \| `published` \| `sold` \| `removed` |
| `slug` | for clean URLs (e.g. `2019-honda-civic-xyz`) |
| `created_at`, `updated_at` | |

### `vehicle_images`
Photos live in R2; the DB stores only the URL.

| Column | Notes |
|--------|-------|
| `id` | primary key |
| `vehicle_id` | FK to `vehicles` |
| `url` | R2 / CDN URL — **never** the image bytes |
| `sort_order` | display order |

### `inquiries`
The bridge between the two apps. Public app writes; admin app reads.

| Column | Notes |
|--------|-------|
| `id` | primary key |
| `vehicle_id` | FK to `vehicles` |
| `from_user_id` | FK to `profiles` (the viewer) |
| `message`, `contact_info` | |
| `status` | `new` \| `read` \| `responded` |
| `created_at` | |

### `favorites` *(optional)*
| Column | Notes |
|--------|-------|
| `user_id`, `vehicle_id` | composite key |

**Rule:** image files go in object storage (R2); the database stores the image *URL*
only. Never store binary image data in the DB.

## The contact flow (how the two apps meet)

1. A logged-in viewer opens a vehicle and submits a message.
2. The **user app** inserts a row into `inquiries` (its one permitted write).
3. A background job fires a notification/email to the owner (optional but recommended).
4. The **admin app** reads inquiries in its dashboard.

No shared code, no payment, no tight coupling — the database is the handoff point.

## Repo & deployment topology

- **Repo 1 — user app.** With Next.js, the "frontend" and "backend" are the *same
  app*: it renders pages **and** hosts API routes (e.g. the inquiry endpoint at
  `/api/...`). There is no separate backend to give its own repo. Do **not** split
  this into a frontend repo and a backend repo connected by API calls — that inserts a
  cross-internet network hop into every data-fetching request, making pages slower and
  fighting the server-rendering that SEO needs.
- **Repo 2 — admin app.** The internal CRUD tool.
- **Database** is a hosted service (Supabase), not a repo and not a Vercel project.
  Both apps hold its connection details as environment variables.

Each repo becomes **its own Vercel project**, giving separate URLs, separate
environment variables, and independent deploys (pushing an admin change can never
break the public site).

```
yourdomain.com          → user app   (or vehicle-finder.vercel.app on free tier)
admin.yourdomain.com    → admin app   (or a non-obvious *.vercel.app subdomain)
Supabase                → shared database (holds the data both apps read/write)
```

### Cache invalidation lives *between* the apps

The public app caches heavily; the app that *changes* data is the admin app; they
don't share memory. So when the lister edits a vehicle, the admin app must **signal**
the public app to refresh — a revalidation webhook (for static generation), a CDN
cache purge for that URL, or a Redis key delete. Because edits are rare, this fires
seldom and is easy to reason about — but skip it and sellers will edit a price and
swear the site is broken.

### Shared-database discipline

A schema change affects **both** apps at once. Make changes backward-compatible: add
the new thing, update both apps, then remove the old thing — rather than renaming in
one shot. Both apps should also connect through Supabase's **connection pooler**
(especially since they're serverless), not raw connections.

## Scaling posture

"Thousands of users" describes how many accounts exist, not concurrent load. Even a
busy day puts only a handful to a few dozen people on the site at any given second —
trivial for this setup, because:

- Listing pages are static/cached, so most requests are served by the **CDN**, never
  reaching the server or database.
- Only small, infrequent dynamic actions (login, favorite, inquiry) hit the database.
- Data changes rarely, so caches stay valid.

If the database ever strains under read load, the fix is **more caching or read
replicas** — not microservices. The three things that actually bite first, in order:

1. **Database connection limits** → use the connection pooler (config, not re-architecture).
2. **Free-tier ceilings** → a "pay ~$19–25/month" problem, not a redesign.
3. **Image bandwidth** → why R2's zero egress + CDN matter.

---

## Status in this codebase (vehicle-admin / vehicle-user)

The actual implementation differs from this reference doc in a few named ways —
recorded here rather than silently drifting from the doc:

- **Roles**: implemented as `admin` / `lister` / `user`, with `admin_profiles` (admin +
  lister) and `user_profiles` (user) as two separate tables rather than one `profiles`
  table with a `role` column — see vehicle-admin migration 0004 for why (RLS is
  simpler when "which app can this account log into" is a table, not a column check).
- **`vehicles`**: column names differ (`lease_amount`/`lease_period` instead of a flat
  `price`+`mileage`, `registration_year` instead of `year`, `km_driven` instead of
  `mileage`) — this platform is lease-first, not a one-time-sale marketplace, so the
  schema reflects that.
- **Inquiries**: not built yet. Contact currently happens via direct phone/WhatsApp
  links on the vehicle detail page (`contact_phone` on the vehicle row), not an
  `inquiries` table + in-app messaging. The `enquiries`/`enquiry_messages` tables
  exist in the schema (migration 0001/0004) for this, unused by either app's UI so far.
- **Favorites**: built, matches the doc's `favorites` table shape.
- ✅ Two Vercel projects, two domains, one Supabase project — matches this doc exactly.
- ✅ Admin→public revalidation signal: `PATCH /api/vehicles/[id]` (status change)
  calls the user app's `POST /api/revalidate` with a shared secret right after the DB
  write, best-effort/non-blocking. See `PERFORMANCE.md`'s "Status" section for the
  larger caching fix this was built on top of (most pages are now genuinely static,
  not just relying on a time window).
- ➖ Connection pooler: not applicable — both apps use Supabase's REST API
  (PostgREST), never a raw Postgres connection, so there's no pooler to route through.
