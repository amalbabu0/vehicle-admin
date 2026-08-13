-- ============================================================================
-- Expiring IP blocks.
--
-- Blocks were permanent until unblocked by hand, which ages badly against how
-- addresses actually work here. Indian mobile carriers and home broadband hand
-- out addresses dynamically — the Jio IPv6 range already visible in
-- visitor_logs may belong to a different subscriber next week. A permanent
-- block on a dynamic address stops punishing whoever abused the site and
-- starts silently locking out an innocent customer, with no error anyone would
-- ever see. Blocks that lapse on their own fail in the safe direction:
-- somebody who is still abusing the site gets blocked again, and somebody who
-- merely inherited the address recovers without anyone noticing.
--
-- NULL means permanent, and stays available on purpose — a persistent scraper
-- on a datacentre address is exactly the case where indefinite is right.
--
-- Expired rows are kept rather than deleted. "This address was blocked twice
-- before" is worth knowing when deciding whether to block it a third time, and
-- the Blocked IPs page shows lapsed entries alongside active ones.
-- ============================================================================

alter table public.blocked_ips add column if not exists expires_at timestamptz;

-- Existing blocks predate this column and were made under "permanent until
-- undone", so leaving them NULL preserves the decision that was actually made
-- rather than retroactively putting a clock on it.

-- The check now has to ignore lapsed rows. Still a primary-key lookup — the
-- expiry test is on the same row — so no extra index is needed.
create or replace function public.is_ip_blocked(p_ip text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from blocked_ips
    where ip = p_ip
      and (expires_at is null or expires_at > now())
  );
$$;
