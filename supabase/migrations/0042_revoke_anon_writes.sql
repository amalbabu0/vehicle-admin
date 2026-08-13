-- ============================================================================
-- Revoke anon's write privileges across the whole public schema.
--
-- Supabase grants anon and authenticated full DML on new tables in public, on
-- the assumption that RLS is the gate. An audit of the live database found 14
-- of 16 tables still carrying it: anon held INSERT, UPDATE and DELETE on
-- vehicles, user_profiles, admin_profiles, audit_logs, site_settings and the
-- rest. Migration 0039 fixed this for two tables; this finishes the job.
--
-- Nothing is exposed today — every INSERT/UPDATE/DELETE policy in the schema
-- requires auth.uid() or is_admin(), neither of which an anon caller can
-- satisfy. That is also precisely why this is safe: a grant that no policy can
-- make use of is a grant nothing depends on. What it buys is independence. As
-- written, RLS is the single point of failure for the entire schema — one
-- over-broad policy, or one `disable row level security` during debugging, and
-- anon could write anywhere. After this, both would have to go wrong.
--
-- SELECT is deliberately untouched: the public site legitimately reads
-- published listings, brands, categories, locations and site_settings as anon,
-- and RLS is doing real filtering work there rather than standing in for a
-- missing grant.
--
-- authenticated is left alone as well — signed-in users genuinely update their
-- own profile and favorites rows, and those policies scope by auth.uid().
-- ============================================================================

do $$
declare
  r record;
begin
  for r in
    select c.oid::regclass as tbl
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
  loop
    execute format('revoke insert, update, delete, truncate on %s from anon', r.tbl);
  end loop;
end;
$$;

-- Future tables inherit the same posture, so this does not have to be
-- remembered on every new migration. Applies to tables created by the role
-- running this; Supabase migrations run as postgres, which is also what
-- creates tables in the migrations above.
alter default privileges in schema public revoke insert, update, delete on tables from anon;
