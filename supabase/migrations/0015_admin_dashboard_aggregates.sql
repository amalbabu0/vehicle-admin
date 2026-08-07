-- Admin dashboard aggregates. Same pattern as 0014 (get_category/brand_
-- vehicle_counts): plain (non-SECURITY DEFINER) functions, so RLS on the
-- underlying `vehicles` table still applies to whoever calls them — an
-- admin sees the true distribution across every status, a lister/public
-- caller transparently only aggregates over what RLS already lets them see
-- (their own rows / published only). No new access-control surface.

create or replace function public.get_vehicle_status_distribution()
returns table (status vehicle_status, vehicle_count bigint)
language sql
stable
as $$
  select status, count(*) as vehicle_count
  from public.vehicles
  group by status;
$$;

create or replace function public.get_fuel_type_distribution()
returns table (fuel_type text, vehicle_count bigint)
language sql
stable
as $$
  select fuel_type, count(*) as vehicle_count
  from public.vehicles
  where fuel_type is not null
  group by fuel_type;
$$;

create or replace function public.get_transmission_distribution()
returns table (transmission text, vehicle_count bigint)
language sql
stable
as $$
  select transmission, count(*) as vehicle_count
  from public.vehicles
  where transmission is not null
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
  group by coalesce(parent.name, loc.name);
$$;

grant execute on function public.get_vehicle_status_distribution() to authenticated;
grant execute on function public.get_fuel_type_distribution() to authenticated;
grant execute on function public.get_transmission_distribution() to authenticated;
grant execute on function public.get_district_vehicle_counts() to authenticated;
