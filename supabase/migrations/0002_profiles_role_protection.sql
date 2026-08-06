-- Security fix: profiles_update_own (0001) allowed a signed-in user to
-- change ANY column on their own row via the anon-key client, including
-- `role` — a self-promotion path (user -> admin) with zero server
-- involvement. Replace it with a policy whose WITH CHECK compares the
-- proposed role against the row's current stored role (the subquery reads
-- the pre-update MVCC snapshot, not the new value), so a self-update that
-- tries to change role is rejected by RLS itself, not just by app code.
drop policy if exists "profiles_update_own" on profiles;

create policy "profiles_update_own"
  on profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from profiles p where p.id = auth.uid())
  );

-- profiles_update_admin (0001) is unaffected — admins can still change role.
