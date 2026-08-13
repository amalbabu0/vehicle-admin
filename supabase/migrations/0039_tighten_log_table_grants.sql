-- ============================================================================
-- Revoke the default anon/authenticated privileges on visitor_logs and
-- blocked_ips, leaving only what each app actually uses.
--
-- Supabase grants anon and authenticated full DML on new tables in the public
-- schema by default, on the assumption that RLS is the gate. Checked after
-- 0036/0038 landed, and both tables had it: anon held SELECT, UPDATE and
-- DELETE on the visitor IP log and on the blocklist.
--
-- Nothing was exposed — no policy admits anon to any of those operations, so
-- every attempt returns zero rows or an error. The problem is that RLS was the
-- *only* thing standing there. A single over-broad policy added later, or one
-- `disable row level security` during debugging, would have published every
-- visitor's IP address and let anyone erase the log. Grants and policies
-- failing independently is the point; one mistake should not be enough.
--
-- What each role genuinely needs:
--   visitor_logs  anon          INSERT  — signed-out page views (0036)
--                 authenticated INSERT  — signed-in page views
--                               SELECT  — the admin IP Logs page, still
--                                         narrowed to admins by RLS
--   blocked_ips   anon          nothing — the public site reaches this only
--                                         through is_ip_blocked(), a SECURITY
--                                         DEFINER function that needs no grant
--                                         from its caller
--                 authenticated SELECT, INSERT, UPDATE, DELETE — admin
--                                         management. UPDATE is required
--                                         because blocking upserts on ip, and
--                                         the ON CONFLICT path is an update.
-- ============================================================================

revoke all on public.visitor_logs from anon;
revoke all on public.visitor_logs from authenticated;
grant insert on public.visitor_logs to anon;
grant select, insert on public.visitor_logs to authenticated;

revoke all on public.blocked_ips from anon;
revoke all on public.blocked_ips from authenticated;
grant select, insert, update, delete on public.blocked_ips to authenticated;
