-- The only email allowed to exercise admin privileges (see is_admin() in
-- 0004_split_profiles.sql). Stored as data, not a literal anywhere in
-- application or function code. To change it:
--   update site_settings set value = '"new-email@example.com"' where key = 'admin_email';
insert into site_settings (key, value) values
  ('admin_email', '"amalbabu2803@gmail.com"')
on conflict (key) do update set value = excluded.value;
