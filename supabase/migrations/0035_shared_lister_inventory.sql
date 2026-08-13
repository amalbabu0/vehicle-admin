-- ============================================================================
-- Shared lister inventory.
--
-- Until now every lister was siloed: vehicles_select_own / vehicles_update_own
-- scoped both reads and writes to lister_id = auth.uid(), so a second lister
-- logging in saw an empty dashboard rather than the team's listings. The
-- product decision is the opposite — all listers work one common pool, seeing
-- and managing every listing regardless of who created it.
--
-- What this changes: any account present in admin_profiles (admin OR lister —
-- that's what is_admin_or_lister() tests) can now select, update, and soft-
-- delete/restore ANY vehicle and its images. vehicles.lister_id stops being an
-- authorization boundary and becomes pure "created by" attribution.
--
-- What this deliberately does NOT change:
--   - vehicles_insert_lister still forces lister_id = auth.uid() on INSERT, so
--     new listings are always attributed to their real creator.
--   - The public/anon path is untouched: vehicles_select_published still
--     requires status = 'published' and is_deleted = false, and the images
--     policy keeps its identical published-vehicle branch. Nothing new is
--     exposed to the user app.
--   - Permanent (hard) delete stays admin-only — it never ran through RLS,
--     it's requireAdmin() + the service-role client in the admin app.
--
-- Accepted tradeoff, recorded here rather than left implicit: this removes the
-- per-lister BOLA boundary that SECURITY.md previously documented as a
-- property of the system. One lister can now edit or delete another's listing.
-- That is the intent of a shared inventory; the audit log (log_audit_event's
-- actor_id = auth.uid()) is what preserves accountability instead.
-- ============================================================================

-- ---- vehicles: SELECT ---------------------------------------------------
-- vehicles_select_admin is folded in and dropped: is_admin_or_lister() is
-- strictly broader (every admin has an admin_profiles row), so keeping a
-- separate admin policy would only add an OR branch evaluated per row.
--
-- The (select ...) wrapper is deliberate and matters here: it makes the
-- planner evaluate the function once per statement as an InitPlan instead
-- of once per candidate row. is_admin_or_lister() takes no arguments and
-- depends only on auth.uid(), so the result is identical either way — but
-- this policy now runs over the whole vehicles table on every lister page
-- load, which the old lister_id = auth.uid() form never did.

drop policy if exists "vehicles_select_own" on vehicles;
drop policy if exists "vehicles_select_admin" on vehicles;

create policy "vehicles_select_staff"
  on vehicles for select
  using ((select is_admin_or_lister()));

-- ---- vehicles: UPDATE ---------------------------------------------------
-- Same folding as above. Covers the status transitions (PATCH), the full
-- detail edit (PUT), and booking_status — all of which were previously
-- owner-scoped for listers.

drop policy if exists "vehicles_update_own" on vehicles;
drop policy if exists "vehicles_update_admin" on vehicles;

create policy "vehicles_update_staff"
  on vehicles for update
  using ((select is_admin_or_lister()))
  with check ((select is_admin_or_lister()));

-- ---- vehicle_images -----------------------------------------------------
-- The published-vehicle branch is copied verbatim from migration 0004 (still
-- no is_deleted check there — unchanged on purpose, so public read behaviour
-- is exactly what it was before this migration). Only the staff branch
-- widens: was "this vehicle is mine, or I'm an admin", now "I'm staff".

drop policy if exists "vehicle_images_select_published_or_own" on vehicle_images;

create policy "vehicle_images_select_published_or_staff"
  on vehicle_images for select
  using (
    exists (
      select 1 from vehicles v
      where v.id = vehicle_images.vehicle_id
        and v.status = 'published'
    )
    or (select is_admin_or_lister())
  );

drop policy if exists "vehicle_images_write_own_vehicle" on vehicle_images;

create policy "vehicle_images_write_staff"
  on vehicle_images for all
  using ((select is_admin_or_lister()))
  with check ((select is_admin_or_lister()));

-- ---- soft delete / restore ----------------------------------------------
-- Both are SECURITY DEFINER (they bypass RLS by design and do their own
-- authorization), so relaxing the policies above is not enough — the
-- ownership test lives inside the function bodies and has to move too.
-- deleted_by_role keeps its original meaning: which kind of account did it,
-- not whether they owned the listing.

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
  elsif is_admin_or_lister() then
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

create or replace function public.restore_vehicle(p_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  select true into v_exists from vehicles where id = p_vehicle_id and is_deleted = true;
  if v_exists is null then
    raise exception 'Deleted listing not found.';
  end if;

  if not is_admin_or_lister() then
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
