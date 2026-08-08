-- Soft-delete: a listing moves to a 10-day recoverable "Deleted Listings"
-- state instead of being hard-deleted immediately. `status` is deliberately
-- untouched by delete/restore — it stays exactly what it was, so restoring
-- naturally returns the listing to whatever state it was actually in
-- (draft/published/etc.), no separate "what to restore it to" logic needed.
alter table vehicles
  add column is_deleted boolean not null default false,
  add column deleted_at timestamptz,
  add column deleted_by uuid references admin_profiles (id) on delete set null,
  add column deleted_by_role admin_role,
  add column permanent_delete_at timestamptz;

-- Partial index: only deleted rows are ever queried by is_deleted (the
-- Deleted Listings pages) or by permanent_delete_at (the cleanup cron) —
-- indexing the other 99% of rows would be pure overhead.
create index vehicles_deleted_idx on vehicles (permanent_delete_at) where is_deleted = true;

-- The public/user-app read path (vehicles_select_published) is the one
-- policy that MUST also exclude soft-deleted rows — that's what actually
-- keeps a deleted listing out of every public page, search result, and
-- the sitemap, since the entire user app reads through this policy alone
-- (see createPublicClient() — no service-role reads exist there). Admin's
-- and each lister's own "select" policies deliberately stay unrestricted
-- by is_deleted (they need to see their deleted rows on the Deleted
-- Listings page) — the active/deleted split for those two happens at the
-- query level (.eq("is_deleted", ...)), not RLS.
drop policy if exists "vehicles_select_published" on vehicles;
create policy "vehicles_select_published"
  on vehicles for select
  using (status = 'published' and is_deleted = false);

-- Hard DELETE via RLS is no longer a lister capability at all — soft
-- delete goes through soft_delete_vehicle() below (UPDATE, not DELETE),
-- and only admins can ever permanently delete (app-level requireAdmin()
-- check + service-role client, see the permanent-delete API route).
drop policy if exists "vehicles_delete_own" on vehicles;

create or replace function public.soft_delete_vehicle(p_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lister_id uuid;
  v_role admin_role;
begin
  select lister_id into v_lister_id from vehicles where id = p_vehicle_id and is_deleted = false;
  if v_lister_id is null then
    raise exception 'Listing not found.';
  end if;

  if is_admin() then
    v_role := 'admin';
  elsif v_lister_id = auth.uid() then
    v_role := 'lister';
  else
    raise exception 'Not authorized to delete this listing.';
  end if;

  update vehicles
  set is_deleted = true,
      deleted_at = now(),
      deleted_by = auth.uid(),
      deleted_by_role = v_role,
      permanent_delete_at = now() + interval '10 days'
  where id = p_vehicle_id;

  perform log_audit_event('vehicle_deleted', 'vehicle', p_vehicle_id, jsonb_build_object('deleted_by_role', v_role));
end;
$$;

grant execute on function public.soft_delete_vehicle(uuid) to authenticated;

create or replace function public.restore_vehicle(p_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lister_id uuid;
begin
  select lister_id into v_lister_id from vehicles where id = p_vehicle_id and is_deleted = true;
  if v_lister_id is null then
    raise exception 'Deleted listing not found.';
  end if;

  if not (is_admin() or v_lister_id = auth.uid()) then
    raise exception 'Not authorized to restore this listing.';
  end if;

  update vehicles
  set is_deleted = false,
      deleted_at = null,
      deleted_by = null,
      deleted_by_role = null,
      permanent_delete_at = null
  where id = p_vehicle_id;

  perform log_audit_event('vehicle_restored', 'vehicle', p_vehicle_id, '{}'::jsonb);
end;
$$;

grant execute on function public.restore_vehicle(uuid) to authenticated;
