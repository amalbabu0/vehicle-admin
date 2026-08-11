-- Booking availability — orthogonal to the existing vehicle_status lifecycle
-- (draft/pending_approval/published/rejected/archived/sold): a published
-- vehicle can be temporarily booked by a lessee without changing its
-- publish/review state, and reversed if the booking falls through. The
-- public site reflects this (grayscale image, disabled Call/WhatsApp/
-- Favorite) without removing the listing from search, related-vehicles, or
-- the sitemap — it stays a real, visible, published listing throughout.
--
-- No new RLS policy needed: vehicles_update_own/vehicles_update_admin
-- (0001_init.sql) already scope UPDATE on the whole vehicles row to the
-- listing's own lister (or an admin), with no column restriction, so they
-- already cover this new column.
create type vehicle_booking_status as enum ('available', 'booked');

alter table vehicles
  add column booking_status vehicle_booking_status not null default 'available';

-- Mirrors vehicles_published_feed_idx's shape (0001_init.sql) — cheaply
-- distinguishes available vs. booked within the published feed, for any
-- future "hide booked" filter, without a sequential scan.
create index vehicles_booking_status_idx
  on vehicles (booking_status)
  where status = 'published';
