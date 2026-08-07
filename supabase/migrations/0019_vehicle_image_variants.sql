-- Multi-size image pipeline: every new upload generates 3 WebP variants
-- (thumbnail, medium, original-optimized). `url` remains the
-- original-optimized image (unchanged meaning for existing rows); these two
-- new columns are nullable so pre-existing vehicle_images rows — which only
-- ever had one size — keep working. Rendering code must fall back to `url`
-- whenever thumbnail_url/medium_url is null.
alter table vehicle_images
  add column thumbnail_url text,
  add column medium_url text;
