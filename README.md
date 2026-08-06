# Admin + Lister Portal

Admin and Lister portal for the Vehicle Listing Platform. Independent
repo/Vercel project/domain from the [User Website](../user) — same
Supabase project, but this app holds the privileged credentials
(service-role key, Cloudflare Images upload token). See
[`../06-liquid-glass-style.md`](../06-liquid-glass-style.md) for the
design system and the root-level `NN-*.md` docs for full product specs.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui ·
React Hook Form + Zod · TanStack Query · Zustand · Framer Motion ·
Supabase (Auth, Postgres, Realtime, Storage, RLS) · Cloudflare Images/CDN
· Upstash Redis

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in real values — see below
pnpm dev --port 3000
```

> **Windows note:** this machine's Application Control policy blocks the
> native SWC binary, so `dev`/`build` are pinned to `--webpack`. That
> flag is safe to keep on Linux/Vercel too (just slower); remove it only
> if you've confirmed Turbopack's native binary loads on your machine.

## Environment variables

See [`.env.example`](.env.example) for the full list. Key points:

- `SUPABASE_SERVICE_ROLE_KEY` and `CLOUDFLARE_IMAGES_API_TOKEN` live only
  here, never in the user app, and never behind `NEXT_PUBLIC_`.
- `lib/env.ts` validates all of these at boot with Zod — a missing/malformed
  var fails immediately with a clear message instead of surfacing as
  `undefined` deep in a request.

## Access model

This app is **read+write** against Supabase: Admin/Super Admin manage
users, listers, and approvals; Listers manage their own vehicles. All of
it is enforced server-side by Supabase RLS policies keyed on
`auth.uid()` + role — the app's own route/UI checks are a UX layer, not
the security boundary. See the Supabase schema/RLS doc once the
Supabase schema task lands.

## Structure

```
app/
  (auth)/          login, register, forgot/reset password, verify-email
  (dashboard)/     protected admin+lister shell (added in later tasks)
lib/
  env.ts           Zod-validated server env
  supabase/        browser + server (RLS-scoped) + service-role clients
  utils.ts         shadcn's cn() helper
components/
  ui/              shadcn/ui primitives
  providers/       React Query, Tooltip, Toaster
proxy.ts           Next 16's renamed Middleware — session-cookie refresh only
```
