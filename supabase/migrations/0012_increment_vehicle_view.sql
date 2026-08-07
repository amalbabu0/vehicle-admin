-- Public vehicle detail pages need to bump view_count for any visitor,
-- including anonymous ones — RLS's vehicles_update_own/_admin policies
-- deliberately don't allow that (only the lister or an admin can write to a
-- vehicle row). A SECURITY DEFINER function scoped to exactly this one
-- column, on published listings only, avoids widening the general UPDATE
-- policy just to support view counting.
create or replace function public.increment_vehicle_view(p_vehicle_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update vehicles
  set view_count = view_count + 1
  where id = p_vehicle_id and status = 'published';
$$;

grant execute on function public.increment_vehicle_view(uuid) to anon, authenticated;
