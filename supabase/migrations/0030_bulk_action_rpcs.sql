-- Batched versions of two RPCs that app/api/admin/listings/bulk/route.ts
-- was calling once per id via Promise.all(ids.map(...)) — up to 200
-- separate PostgREST round trips per bulk action (schema caps the batch at
-- 200 ids). Both do the same per-row work as their singular counterparts,
-- just looped inside Postgres instead of over the network.

-- Reuses soft_delete_vehicle(uuid) per id (same ownership/admin check,
-- same audit log entry) so there's exactly one place that owns that
-- logic — this only changes how many round trips it takes to call it
-- for a batch. A failure on one id doesn't abort the rest, matching the
-- existing app-level behavior of counting per-row success/failure.
create or replace function public.soft_delete_vehicles(p_vehicle_ids uuid[])
returns table(vehicle_id uuid, success boolean, error_message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  foreach v_id in array p_vehicle_ids loop
    begin
      perform public.soft_delete_vehicle(v_id);
      vehicle_id := v_id;
      success := true;
      error_message := null;
      return next;
    exception when others then
      vehicle_id := v_id;
      success := false;
      error_message := sqlerrm;
      return next;
    end;
  end loop;
end;
$$;

grant execute on function public.soft_delete_vehicles(uuid[]) to authenticated;

-- One insert instead of one RPC call per id — same columns/shape as
-- log_audit_event(), just fed from unnest() over the array.
create or replace function public.log_audit_events_bulk(
  p_action text,
  p_entity_type text,
  p_entity_ids uuid[],
  p_metadata jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
  select auth.uid(), p_action, p_entity_type, id, p_metadata
  from unnest(p_entity_ids) as id;
end;
$$;

grant execute on function public.log_audit_events_bulk(text, text, uuid[], jsonb) to authenticated;
