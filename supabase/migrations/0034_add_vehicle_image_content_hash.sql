-- Lets the duplicate-listing check compare uploaded photos by content rather
-- than URL (upload keys are random UUIDs, so the same photo uploaded twice
-- never produces the same URL). Hashed server-side from the original bytes
-- at upload time, before any resize/compress — see
-- app/api/uploads/vehicle-image/route.ts.
alter table vehicle_images
  add column content_hash text;
