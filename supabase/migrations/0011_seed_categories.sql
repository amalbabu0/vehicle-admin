-- Vehicle categories for the user site's "Browse by category" section.
-- This table has existed since 0001 but was never seeded — the user app
-- needs real rows to show real counts (data-only change, shared DB, no
-- admin app code touched).
insert into public.categories (name, slug) values
  ('Cars', 'cars'),
  ('Bikes', 'bikes'),
  ('Scooters', 'scooters'),
  ('SUVs', 'suvs'),
  ('EVs', 'evs'),
  ('Commercial Vehicles', 'commercial-vehicles')
on conflict (slug) do nothing;
