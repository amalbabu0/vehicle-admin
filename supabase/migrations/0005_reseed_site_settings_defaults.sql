-- site_settings was dropped and recreated in 0004, which wiped the default
-- rows the original seed/0001_site_settings.sql inserted (Supabase's seed
-- tracking is filename-based, so it won't re-run 0001 even though the
-- table underneath it is new). Restoring those defaults here instead —
-- migrations are more reliably tracked than seeds for anything that needs
-- to survive a schema rebuild.
insert into site_settings (key, value) values
  ('maintenance_mode', 'false'),
  ('service_charge_default_percent', '5'),
  ('contact_info', '{"email": "", "phone": "", "whatsapp": ""}'),
  ('homepage_banner', '{"enabled": false, "imageUrl": "", "linkUrl": "", "headline": ""}'),
  ('featured_listing_ids', '[]'),
  ('site_announcements', '[]')
on conflict (key) do nothing;
