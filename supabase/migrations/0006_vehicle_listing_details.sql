-- Fields extracted from quick listings that belong to the vehicle record.
-- Image URLs remain normalized in vehicle_images so each image retains order
-- and cover-image information.
alter table public.vehicles
  add column if not exists model text,
  add column if not exists ownership_count integer
    check (ownership_count is null or ownership_count >= 0);
