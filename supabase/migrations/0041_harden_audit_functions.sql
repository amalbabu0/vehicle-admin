-- ============================================================================
-- Stop anon callers forging audit history.
--
-- Both functions below are SECURITY DEFINER and were executable by anon, and
-- neither checked who was calling. Anyone holding the public anon key could
-- write whatever they liked into audit_logs — the table SECURITY.md names as
-- the accountability mechanism that replaced the per-lister ownership boundary
-- when inventory became shared (migration 0035). Forged "listing_deleted" or
-- "admin_role_changed" rows attributed to "System" would corrupt exactly the
-- record you would reach for after an incident.
--
-- Neither is fixed by revoking anon outright, and for different reasons —
-- hence two different treatments.
-- ============================================================================

-- ---- log_audit_event: narrow what an anon caller may write -----------------
-- Cannot simply revoke: the public app calls this during register, which may
-- have no session yet depending on whether email confirmation is on, and
-- breaking account creation to tighten a log would be a bad trade.
--
-- So the guard is on content instead of on access. A caller with no session
-- may only record the handful of pre-session auth events the public app
-- actually writes; everything else from an anon caller is dropped. Signed-in
-- callers are unchanged and were never the risk — actor_id is auth.uid(), so
-- they can only ever write rows attributed to themselves.
--
-- Silent return rather than raise: every call site treats this as
-- fire-and-forget after the real work has already succeeded, so raising here
-- would fail a completed registration or login to protect a log line.
create or replace function public.log_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     and not (p_entity_type = 'auth'
              and p_action in ('register', 'login', 'logout', 'password_reset')) then
    return;
  end if;

  insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata);
end;
$$;

-- ---- log_failed_login: take it away from anon entirely ---------------------
-- The caller supplies p_ip, so an anon caller could fabricate failed logins
-- against any address. Those feed the "Possible brute-force activity" panel on
-- the Activity Logs page — which now sits beside a Block button, so a forged
-- alert is a route to getting an innocent address blocked. The existing
-- 20-per-minute throttle limits volume, not authenticity.
--
-- Unlike log_audit_event this has exactly one caller, the admin app's login
-- action, and that app holds a service-role key. Moving it onto the service
-- client (see admin/app/actions/auth.ts) means anon never needs to reach it,
-- so the grant goes away rather than being narrowed.
revoke execute on function public.log_failed_login(text, text, text) from public;
revoke execute on function public.log_failed_login(text, text, text) from anon;
revoke execute on function public.log_failed_login(text, text, text) from authenticated;
grant execute on function public.log_failed_login(text, text, text) to service_role;
