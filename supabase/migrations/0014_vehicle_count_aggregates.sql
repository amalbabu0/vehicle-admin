-- Performance audit (see PERFORMANCE_STANDARDS.md #3): the user app's
-- category/brand listing counts and "popular searches" were computed by
-- fetching EVERY published vehicle row (just one column) and grouping/
-- sorting/limiting in JS — an unbounded full-table fetch that gets slower
-- with every new listing, since the Supabase JS client has no GROUP BY.
-- These functions push the aggregation into Postgres instead, so the app
-- only ever gets back the already-grouped (and, for popular searches,
-- already-limited) rows.
--
-- No SECURITY DEFINER needed — these only ever touch status = 'published'
-- rows, which the existing vehicles_select_published RLS policy already
-- grants to every caller (anon included).

create or replace function public.get_category_vehicle_counts()
returns table (category_id uuid, vehicle_count bigint)
language sql
stable
as $$
  select category_id, count(*) as vehicle_count
  from public.vehicles
  where status = 'published' and category_id is not null
  group by category_id;
$$;

create or replace function public.get_brand_vehicle_counts()
returns table (brand_id uuid, vehicle_count bigint)
language sql
stable
as $$
  select brand_id, count(*) as vehicle_count
  from public.vehicles
  where status = 'published' and brand_id is not null
  group by brand_id;
$$;

create or replace function public.get_popular_searches(p_limit int default 8)
returns table (brand_name text, model text, total_views bigint)
language sql
stable
as $$
  select b.name as brand_name, v.model, sum(v.view_count) as total_views
  from public.vehicles v
  join public.brands b on b.id = v.brand_id
  where v.status = 'published' and v.model is not null
  group by b.name, v.model
  order by total_views desc
  limit greatest(p_limit, 0);
$$;

grant execute on function public.get_category_vehicle_counts() to anon, authenticated;
grant execute on function public.get_brand_vehicle_counts() to anon, authenticated;
grant execute on function public.get_popular_searches(int) to anon, authenticated;
