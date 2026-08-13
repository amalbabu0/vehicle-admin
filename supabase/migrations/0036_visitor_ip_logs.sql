-- ============================================================================
-- Visitor IP log (admin → "IP Logs").
--
-- One row per public-site page view, signed-in or not. Logging signed-out
-- visitors is the entire point — this is a traffic/abuse record, not a
-- per-account analytic — so the write path has to work with no session at all.
-- The user app records it from proxy.ts inside event.waitUntil(), which keeps
-- it off the response path (see PERFORMANCE.md: most public routes are static
-- and CDN-served; the proxy still runs on every request, the insert must not
-- make the visitor wait for it).
--
-- ---- Why anon may INSERT but not SELECT -----------------------------------
-- The user app deliberately holds no service-role key (its lib/env.ts documents
-- that as a property of the split), and unauthenticated visitors are by
-- definition the anon role, so an anon INSERT policy is the narrowest grant
-- that makes this work without handing the public app privileged credentials.
--
-- Accepted tradeoff, recorded rather than left implicit: the anon key is public
-- (the user app hands it to the browser via /api/public-config), so a third
-- party who reads it can POST fabricated rows straight to PostgREST and pollute
-- this log. That is bounded on purpose:
--   - INSERT only. There is no anon SELECT policy, so the log cannot be read
--     back; it is not an exfiltration path to visitor IPs.
--   - The length CHECKs below cap how much junk a single row can carry.
--   - No UPDATE or DELETE policy exists for anyone, so existing rows cannot be
--     altered or erased through RLS — only the service-role client (admin app)
--     can prune, which is what a retention job would use.
-- The alternative — routing every page view through an authenticated endpoint
-- on the admin app — was rejected as a heavier cross-app dependency on the
-- hottest path in the system, for a log whose worst-case compromise is noise.
--
-- ---- Note on id ------------------------------------------------------------
-- bigint identity rather than the uuid every other table here uses. This is the
-- one table whose row count is driven by traffic instead of by inventory or
-- staff actions, and a sequential 8-byte key keeps both the primary key index
-- and the created_at index appending at the right edge instead of scattering
-- random uuids through them.
-- ============================================================================

create table if not exists public.visitor_logs (
  id bigint generated always as identity primary key,
  -- 45 = longest possible IPv6 form, including an IPv4-mapped tail.
  -- Stored as text, not inet: x-forwarded-for can legitimately be absent
  -- behind some proxies, and "unknown" is more honest in the log than a
  -- silently dropped row.
  ip text not null check (length(ip) <= 45),
  path text not null check (length(path) <= 512),
  user_agent text check (length(user_agent) <= 512),
  referrer text check (length(referrer) <= 512),
  -- Two-letter code from Vercel's x-vercel-ip-country when present.
  country text check (length(country) <= 2),
  -- Whether the visitor had a session. Free to capture (the proxy already
  -- resolves the user to decide auth redirects) and it separates "someone
  -- browsing logged out" from "a known account" in the log.
  is_authenticated boolean not null default false,
  created_at timestamptz not null default now()
);

-- Default sort of the IP Logs page, and the column a retention job would
-- prune on. Descending to match how it is read.
create index if not exists visitor_logs_created_at_idx on public.visitor_logs (created_at desc);

-- The page's IP filter/search (.eq / .ilike on ip) — per PERFORMANCE_STANDARDS
-- item 2, this table grows unbounded, so the filtered column needs an index.
create index if not exists visitor_logs_ip_idx on public.visitor_logs (ip);

alter table public.visitor_logs enable row level security;

-- Writers: any visitor, session or not. with check (true) is the point — the
-- app decides what a row contains, RLS only decides who may add one.
drop policy if exists "visitor_logs_insert_public" on public.visitor_logs;
create policy "visitor_logs_insert_public"
  on public.visitor_logs for insert
  to anon, authenticated
  with check (true);

-- Readers: admins only. Matches the /admin route group, which requireAdmin()
-- gates to the admin role — listers cannot reach the IP Logs page, so they get
-- no policy here either.
drop policy if exists "visitor_logs_select_admin" on public.visitor_logs;
create policy "visitor_logs_select_admin"
  on public.visitor_logs for select
  to authenticated
  using ((select is_admin()));

-- Explicit rather than relying on Supabase's default privileges for new tables
-- in public, so the grants are visible next to the policies that shape them.
-- No UPDATE/DELETE to either role: a log nobody can rewrite is the useful kind.
grant insert on public.visitor_logs to anon, authenticated;
grant select on public.visitor_logs to authenticated;
