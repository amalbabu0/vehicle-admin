-- get_category_vehicle_counts/get_brand_vehicle_counts/get_popular_searches
-- (0014) and the public site's own reads all already filter through
-- vehicles_select_published RLS (fixed in 0022 to require is_deleted =
-- false), so those needed no changes. These four are admin-dashboard
-- aggregates that run under admin's own vehicles_select_admin RLS, which
-- is deliberately unrestricted (admin needs to see deleted rows too, on
-- the Deleted Listings page) — so the "current state" snapshots below need
-- the exclusion added explicitly, or a soft-deleted listing would keep
-- inflating the status/fuel/transmission/district breakdown charts.
--
-- get_daily_listing_counts (0016) is deliberately left untouched: it
-- counts by created_at, a historical creation-count, not current state —
-- deleting a listing later shouldn't rewrite how many were created on a
-- given day, the same way a user deleting their account doesn't rewrite
-- a signups-per-day chart.
create or replace function public.get_vehicle_status_distribution()
returns table (status vehicle_status, vehicle_count bigint)
language sql
stable
as $$
  select status, count(*) as vehicle_count
  from public.vehicles
  where is_deleted = false
  group by status;
$$;

create or replace function public.get_fuel_type_distribution()
returns table (fuel_type text, vehicle_count bigint)
language sql
stable
as $$
  select fuel_type, count(*) as vehicle_count
  from public.vehicles
  where fuel_type is not null and is_deleted = false
  group by fuel_type;
$$;

create or replace function public.get_transmission_distribution()
returns table (transmission text, vehicle_count bigint)
language sql
stable
as $$
  select transmission, count(*) as vehicle_count
  from public.vehicles
  where transmission is not null and is_deleted = false
  group by transmission;
$$;

create or replace function public.get_district_vehicle_counts()
returns table (district_name text, vehicle_count bigint)
language sql
stable
as $$
  select coalesce(parent.name, loc.name) as district_name, count(*) as vehicle_count
  from public.vehicles v
  join public.locations loc on loc.id = v.location_id
  left join public.locations parent on parent.id = loc.parent_location_id
  where v.is_deleted = false
  group by coalesce(parent.name, loc.name);
$$;
