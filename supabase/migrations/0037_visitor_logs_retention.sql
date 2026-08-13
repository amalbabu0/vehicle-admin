-- ============================================================================
-- 24-hour retention on visitor_logs.
--
-- Anything older than one day is deleted outright — no soft delete, no
-- archive table. The most recent day is the only copy that exists, which is
-- the intent: keep a day, drop the rest permanently.
--
-- ---- Why pg_cron rather than the existing Vercel cron ----------------------
-- The app already has a Vercel cron (vercel.json → cleanup-deleted-vehicles,
-- daily at 03:00), and adding to it was the obvious first thought. Two reasons
-- it loses here:
--   1. Vercel's Hobby plan runs crons once a day. A daily purge cannot hold a
--      24-hour window — a row written just after a run survives until the next
--      one, so retention drifts to nearly 48 hours. Hourly keeps the true
--      ceiling at 1 day + 1 hour.
--   2. It removes a dependency. A DB-side job keeps running whether or not the
--      admin app is deployed, reachable, or holding a valid CRON_SECRET, and a
--      retention promise that quietly stops being kept is worse than no
--      promise. This is one DELETE against an indexed column; it does not need
--      an HTTP round trip and a serverless function to express it.
--
-- The job runs as the role that schedules it (postgres), which owns the table
-- and is therefore not subject to its RLS — deliberate, since visitor_logs has
-- no DELETE policy for anyone and nothing else should be able to erase rows.
-- ============================================================================

create extension if not exists pg_cron;

-- Supabase installs pg_cron's objects in the `cron` schema; these grants are
-- what let the project's own role inspect and manage jobs afterwards (e.g.
-- selecting from cron.job to confirm the schedule).
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Hourly at :17 rather than :00 — nothing else in this project runs on the
-- hour, and staying off the boundary keeps the purge from queuing behind
-- whatever else the platform schedules there.
--
-- cron.schedule upserts on job name, so re-running this migration re-points
-- the existing job instead of creating a duplicate.
select cron.schedule(
  'purge-visitor-logs',
  '17 * * * *',
  $$delete from public.visitor_logs where created_at < now() - interval '1 day'$$
);

-- Bring the table in line immediately rather than waiting for the first run,
-- so the retention window is true from the moment this migration lands.
delete from public.visitor_logs where created_at < now() - interval '1 day';
