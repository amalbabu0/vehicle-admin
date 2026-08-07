-- The My Vehicles redesign puts Delete inside the card's dropdown menu for
-- every status (Pending/Rejected/Archived show it directly, Published
-- keeps it reachable via the dropdown too — see components/lister's
-- vehicle-card-menu.tsx). The old policy only let a lister delete their
-- own draft-status vehicles; broadened to any status, still fully scoped
-- to their own rows (lister_id = auth.uid()). Admin's own delete rights
-- (vehicles_delete_admin) are untouched.
drop policy if exists "vehicles_delete_own_draft" on vehicles;

create policy "vehicles_delete_own"
  on vehicles for delete
  using (lister_id = auth.uid());
