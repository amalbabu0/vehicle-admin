-- Auth events (login/logout/password_reset) always have an entity_id in
-- practice, but making the param optional/nullable at the SQL level lets
-- the generated TS types accept `string | null | undefined` cleanly instead
-- of fighting the type checker at every call site.
create or replace function public.log_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata);
end;
$$;
