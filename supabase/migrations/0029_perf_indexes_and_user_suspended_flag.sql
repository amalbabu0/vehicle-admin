-- Performance fixes from an internal audit (see PERFORMANCE_STANDARDS.md).

-- 1. Denormalized suspension flag on user_profiles, kept in sync by the one
-- app code path that changes ban status (app/api/admin/users/[id]/route.ts
-- PATCH). Lets the admin Users page filter/paginate by active/suspended at
-- the DB level instead of enriching every matching row (previously capped
-- at 500, regardless of the requested page size) via a per-row Supabase
-- Auth Admin API call just to compute this in JS — see
-- lib/admin/users-data.ts getUsersPage().
alter table public.user_profiles add column if not exists is_suspended boolean not null default false;

-- Backfill from the real source of truth (auth.users.banned_until) for
-- accounts that already exist.
update public.user_profiles up
set is_suspended = (au.banned_until is not null and au.banned_until > now())
from auth.users au
where au.id = up.id;

create index if not exists user_profiles_is_suspended_idx on public.user_profiles (is_suspended);
create index if not exists user_profiles_created_at_idx on public.user_profiles (created_at desc);
create index if not exists user_profiles_full_name_trgm_idx on public.user_profiles using gin (full_name gin_trgm_ops);

-- 2. vehicles.created_at — the default sort for the admin Listings table,
-- the dashboard's latest-listings widget, and the date-range filter; none
-- of the existing vehicles indexes (lister_id, brand_id, category_id,
-- location_id, status, fuel_type, transmission, registration_year,
-- lease_amount, name/model/condition trigram — see migrations 0004/0013)
-- cover it. Composite with is_deleted since nearly every listing query
-- filters that too.
create index if not exists vehicles_active_created_idx on public.vehicles (is_deleted, created_at desc);

-- 3. audit_logs.action — filtering the Activity Logs page by action type
-- had no supporting index (created_at/actor_id/entity_type+entity_id
-- already are, see migration 0001/0004).
create index if not exists audit_logs_action_idx on public.audit_logs (action);
