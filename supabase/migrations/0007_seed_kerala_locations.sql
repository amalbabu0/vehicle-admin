-- Seeds the `locations` table with Kerala's 14 districts and their 78
-- taluks (verified against the official administrative hierarchy —
-- https://en.wikipedia.org/wiki/List_of_taluks_of_Kerala). Districts are
-- top-level (parent_location_id null); taluks are children. This is what
-- the manual listing form's Location picker searches against — free-text
-- location entry was failing with "not found" because it required an
-- exact match against a table that had no real data in it.
do $$
declare
  district_row record;
  district_id uuid;
begin
  for district_row in
    select * from (values
      ('Thiruvananthapuram', array['Neyyattinkara', 'Kattakkada', 'Nedumangad', 'Thiruvananthapuram', 'Chirayinkeezhu', 'Varkala']),
      ('Kollam', array['Kollam', 'Kunnathoor', 'Karunagappally', 'Kottarakkara', 'Punalur', 'Pathanapuram']),
      ('Pathanamthitta', array['Adoor', 'Konni', 'Kozhencherry', 'Ranni', 'Mallappally', 'Thiruvalla']),
      ('Alappuzha', array['Chenganoor', 'Mavelikkara', 'Karthikappally', 'Kuttanad', 'Ambalappuzha', 'Cherthala']),
      ('Kottayam', array['Changanasserry', 'Kottayam', 'Vaikom', 'Meenachil', 'Kanjirappally']),
      ('Idukki', array['Peermade', 'Udumbanchola', 'Idukki', 'Thodupuzha', 'Devikulam']),
      ('Ernakulam', array['Kothamangalam', 'Muvattupuzha', 'Kunnathunad', 'Kanayannur', 'Kochi', 'North Paravur', 'Aluva']),
      ('Thrissur', array['Chalakudy', 'Mukundapuram', 'Kodungallur', 'Thrissur', 'Chavakkad', 'Kunnamkulam', 'Thalapilly']),
      ('Palakkad', array['Alathoor', 'Chittur', 'Palakkad', 'Pattambi', 'Ottappalam', 'Mannarkkad', 'Attappady']),
      ('Malappuram', array['Perinthalmanna', 'Nilambur', 'Eranad', 'Kondotty', 'Ponnani', 'Tirur', 'Tirurangadi']),
      ('Kozhikode', array['Kozhikode', 'Thamarassery', 'Koyilandy', 'Vatakara']),
      ('Wayanad', array['Vythiri', 'Sulthan Bathery', 'Mananthavadi']),
      ('Kannur', array['Thalassery', 'Iritty', 'Kannur', 'Taliparamba', 'Payyanur']),
      ('Kasaragod', array['Hosdurg', 'Vellarikund', 'Kasaragod', 'Manjeshwaram'])
    ) as t(district_name, taluks)
  loop
    insert into locations (name, slug)
    values (
      district_row.district_name,
      lower(regexp_replace(district_row.district_name, '[^a-zA-Z0-9]+', '-', 'g'))
    )
    on conflict (slug) do update set name = excluded.name
    returning id into district_id;

    insert into locations (name, slug, parent_location_id)
    select
      taluk,
      lower(regexp_replace(district_row.district_name, '[^a-zA-Z0-9]+', '-', 'g'))
        || '-' || lower(regexp_replace(taluk, '[^a-zA-Z0-9]+', '-', 'g')),
      district_id
    from unnest(district_row.taluks) as taluk
    on conflict (slug) do update set name = excluded.name, parent_location_id = excluded.parent_location_id;
  end loop;
end $$;
