-- Default site_settings rows. Safe to re-run — upserts on the primary key.
insert into site_settings (key, value) values
  ('maintenance_mode', 'false'),
  ('service_charge_default_percent', '5'),
  ('contact_info', '{"email": "", "phone": "", "whatsapp": ""}'),
  ('homepage_banner', '{"enabled": false, "imageUrl": "", "linkUrl": "", "headline": ""}'),
  ('featured_listing_ids', '[]'),
  ('site_announcements', '[]')
on conflict (key) do nothing;
