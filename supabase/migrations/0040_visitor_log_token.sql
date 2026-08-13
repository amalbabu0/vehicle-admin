-- ============================================================================
-- Close the open INSERT on visitor_logs.
--
-- Migration 0036 gave anon an unconditional INSERT policy and documented the
-- worst case as "noise". That was true when the log was only ever read by a
-- human. Migration 0038 added IP blocking, which made the log an *input to a
-- security decision*: anyone holding the public anon key could insert rows
-- attributing hostile-looking paths to an address of their choosing, and wait
-- for an admin to block an innocent visitor. The tradeoff was re-evaluated
-- because the thing it was weighed against changed.
--
-- The fix is a shared token the public app holds server-side. Unlike the anon
-- key — which the user app deliberately hands to the browser via
-- /api/public-config — this value is only ever read inside proxy.ts and never
-- reaches a client. It lives in app_secrets, a table with RLS on and no
-- policies at all, so no PostgREST caller of any role can read it; only
-- SECURITY DEFINER functions and the service role see it.
--
-- Fails closed: a caller with the wrong token, or none, writes nothing. The
-- consequence of a misconfiguration is an empty log, never an open one, and
-- never a broken page — record_visit() is called fire-and-forget from the
-- proxy and its return value is ignored.
-- ============================================================================

create table if not exists public.app_secrets (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now()
);

alter table public.app_secrets enable row level security;

-- Deliberately no policies. RLS with zero policies denies every row to every
-- role that goes through it, which is exactly the intent: this table is
-- reachable only from SECURITY DEFINER function bodies.
revoke all on public.app_secrets from anon;
revoke all on public.app_secrets from authenticated;

-- Generated in the database so the secret never exists in the repository.
-- Two uuids concatenated: 244 bits of entropy, no pgcrypto dependency.
-- on conflict do nothing so re-running never rotates a working token out from
-- under a deployed app.
insert into public.app_secrets (key, value)
values ('visitor_log_token', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;

create or replace function public.record_visit(
  p_token text,
  p_ip text,
  p_path text,
  p_user_agent text default null,
  p_referrer text default null,
  p_country text default null,
  p_is_authenticated boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected text;
begin
  select value into v_expected from app_secrets where key = 'visitor_log_token';

  -- Silent return rather than raise: this is called fire-and-forget from the
  -- proxy, so an exception has no one to surface it to, and a loud failure
  -- here must never become a visible failure on the public site.
  if v_expected is null or p_token is null or p_token <> v_expected then
    return;
  end if;

  -- Clamped server-side too. The app already clamps, but the length CHECKs on
  -- visitor_logs would otherwise turn an over-long value into a lost row.
  insert into visitor_logs (ip, path, user_agent, referrer, country, is_authenticated)
  values (
    left(p_ip, 45),
    left(p_path, 512),
    left(p_user_agent, 512),
    left(p_referrer, 512),
    left(p_country, 2),
    coalesce(p_is_authenticated, false)
  );
end;
$$;

revoke all on function public.record_visit(text, text, text, text, text, text, boolean) from public;
grant execute on function public.record_visit(text, text, text, text, text, text, boolean) to anon, authenticated;

-- The hole itself. With record_visit() in place nothing needs direct INSERT on
-- this table any more.
drop policy if exists "visitor_logs_insert_public" on public.visitor_logs;
revoke insert on public.visitor_logs from anon;
revoke insert on public.visitor_logs from authenticated;
