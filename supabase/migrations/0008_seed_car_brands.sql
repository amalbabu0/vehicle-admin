-- Seeds `brands` with the major car brands active in the Indian market
-- (source: lib/data/india-car-brands.json, kept in sync by hand). Models
-- are NOT a DB table — vehicles.model is free text, and the Model picker
-- in the manual listing form suggests from that same JSON file client-side,
-- filtered by the selected brand. Existing rows (e.g. auto-created by a
-- past listing submission with an unrecognized brand name) are preserved;
-- this only inserts brands that don't already exist by slug.
insert into brands (name, slug)
values
  ('Maruti Suzuki', 'maruti-suzuki'),
  ('Hyundai', 'hyundai'),
  ('Tata', 'tata'),
  ('Mahindra', 'mahindra'),
  ('Kia', 'kia'),
  ('Toyota', 'toyota'),
  ('Honda', 'honda'),
  ('Renault', 'renault'),
  ('Nissan', 'nissan'),
  ('Volkswagen', 'volkswagen'),
  ('Skoda', 'skoda'),
  ('MG', 'mg'),
  ('Citroen', 'citroen'),
  ('BYD', 'byd'),
  ('Jeep', 'jeep'),
  ('BMW', 'bmw'),
  ('Mercedes-Benz', 'mercedes-benz'),
  ('Audi', 'audi'),
  ('Volvo', 'volvo'),
  ('Land Rover', 'land-rover'),
  ('Lexus', 'lexus'),
  ('Porsche', 'porsche'),
  ('Jaguar', 'jaguar'),
  ('Mini', 'mini'),
  ('Isuzu', 'isuzu'),
  ('Force Motors', 'force-motors'),
  ('Mitsubishi', 'mitsubishi'),
  ('Ford', 'ford'),
  ('Chevrolet', 'chevrolet'),
  ('Fiat', 'fiat'),
  ('Datsun', 'datsun')
on conflict (slug) do nothing;
