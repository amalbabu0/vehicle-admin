-- Daily listing/user counts for the Analytics module's trend charts.
-- Same RLS-transparent pattern as migrations 0014/0015: a non-admin caller
-- only ever aggregates over rows they could already see individually
-- (published/own vehicles, their own profile row) — no new access surface.
-- Monthly rollups are computed client-side from these daily buckets rather
-- than a separate pair of RPCs, since it's the same underlying data at a
-- coarser grouping.

create or replace function public.get_daily_listing_counts(p_days int default 90)
returns table (day date, listing_count bigint)
language sql
stable
as $$
  select date_trunc('day', created_at)::date as day, count(*) as listing_count
  from public.vehicles
  where created_at >= now() - (greatest(p_days, 1) || ' days')::interval
  group by day
  order by day;
$$;

create or replace function public.get_daily_user_counts(p_days int default 90)
returns table (day date, user_count bigint)
language sql
stable
as $$
  select date_trunc('day', created_at)::date as day, count(*) as user_count
  from public.user_profiles
  where created_at >= now() - (greatest(p_days, 1) || ' days')::interval
  group by day
  order by day;
$$;

grant execute on function public.get_daily_listing_counts(int) to authenticated;
grant execute on function public.get_daily_user_counts(int) to authenticated;
