-- Failed admin-login attempts weren't recorded anywhere — only successful
-- logins were audit-logged (see app/actions/auth.ts). This adds a way to
-- log them and a way to query for brute-force bursts.
--
-- log_failed_login() is a dedicated, narrow function rather than reusing
-- the general log_audit_event() RPC: it needs to be callable by anonymous
-- (pre-login) visitors, and log_audit_event() takes a free-form action
-- string — granting that to anon would let anyone write arbitrary entries
-- into the audit trail. This function hardcodes action='login_failed' and
-- entity_type='auth' so a caller can only ever record that one fact.
--
-- Because it's reachable by anon, it's also reachable directly via the
-- PostgREST RPC endpoint, not just through the app's own rate-limited
-- login action — so it includes its own light per-IP cap (20/minute) as a
-- self-contained defense against someone spamming the audit log directly.
create or replace function public.log_failed_login(p_email text, p_ip text, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
  from audit_logs
  where action = 'login_failed'
    and metadata ->> 'ip' = p_ip
    and created_at >= now() - interval '1 minute';

  if recent_count >= 20 then
    return;
  end if;

  insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    null,
    'login_failed',
    'auth',
    null,
    jsonb_build_object(
      'email', left(coalesce(p_email, ''), 255),
      'ip', left(coalesce(p_ip, 'unknown'), 64),
      'reason', left(coalesce(p_reason, ''), 100)
    )
  );
end;
$$;

grant execute on function public.log_failed_login(text, text, text) to anon, authenticated;

-- RLS-transparent like the other admin aggregate RPCs (0014/0015/0016):
-- plain (non security definer) function relying on the existing
-- audit_logs_select_admin policy (using is_admin()), so only real admins
-- ever get rows back.
create or replace function public.get_login_attack_alerts(p_minutes int default 15, p_threshold int default 3)
returns table (ip text, attempt_count bigint, last_attempt_at timestamptz, emails text[])
language sql
stable
as $$
  select
    metadata ->> 'ip' as ip,
    count(*) as attempt_count,
    max(created_at) as last_attempt_at,
    array_agg(distinct metadata ->> 'email') as emails
  from audit_logs
  where action = 'login_failed'
    and created_at >= now() - (greatest(p_minutes, 1) || ' minutes')::interval
  group by metadata ->> 'ip'
  having count(*) >= greatest(p_threshold, 1)
  order by attempt_count desc;
$$;

grant execute on function public.get_login_attack_alerts(int, int) to authenticated;
