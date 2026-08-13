-- ============================================================================
-- IP blocklist.
--
-- Admin-curated list of addresses denied access to the public site. The user
-- app's proxy checks each incoming request against it and returns 403 before
-- rendering anything.
--
-- ---- Why a per-IP function instead of letting the site read the table ------
-- The public app needs to answer "is this visitor blocked?" on every request,
-- but it must not be able to read the list. A blocklist is a list of real
-- people's IP addresses — personal data — and the anon key is public (the user
-- app hands it to the browser via /api/public-config), so an anon SELECT
-- policy here would publish every address an admin has ever flagged to anyone
-- who reads the key.
--
-- is_ip_blocked(p_ip) closes that: SECURITY DEFINER so it sees the table
-- without the caller having any grant on it, and it returns a single boolean
-- about an address the caller already knows. There is no query shape that
-- returns "all blocked IPs", so the list cannot be enumerated through it.
--
-- Deliberately not stored in visitor_logs: that table is purged hourly on a
-- 24-hour window (migration 0037), and a block must outlive the log entry that
-- prompted it.
-- ============================================================================

create table if not exists public.blocked_ips (
  -- The address itself is the key: blocking the same IP twice is the same
  -- fact, not two rows, and this makes the proxy's lookup a primary-key hit.
  ip text primary key check (length(ip) <= 45),
  reason text check (length(reason) <= 200),
  -- Kept when the admin account is later removed: who blocked it is useful
  -- history, but losing the attribution must never silently unblock an
  -- address, so this nulls rather than cascading the delete.
  blocked_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists blocked_ips_created_at_idx on public.blocked_ips (created_at desc);

alter table public.blocked_ips enable row level security;

-- Admins only, for every operation. No anon or lister policy exists, and the
-- public site reaches the data solely through the function below.
drop policy if exists "blocked_ips_all_admin" on public.blocked_ips;
create policy "blocked_ips_all_admin"
  on public.blocked_ips for all
  to authenticated
  using ((select is_admin()))
  with check ((select is_admin()));

grant select, insert, delete on public.blocked_ips to authenticated;

create or replace function public.is_ip_blocked(p_ip text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from blocked_ips where ip = p_ip);
$$;

-- Explicit revoke first: functions are executable by PUBLIC by default, and
-- for a SECURITY DEFINER function that default should always be stated rather
-- than inherited.
revoke all on function public.is_ip_blocked(text) from public;
grant execute on function public.is_ip_blocked(text) to anon, authenticated;
