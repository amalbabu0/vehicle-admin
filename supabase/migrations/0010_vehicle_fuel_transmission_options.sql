-- Fuel type and transmission are now fixed dropdowns in the app (required
-- for new listings). Existing rows may still have null values from before
-- this constraint existed, so null stays allowed at the DB level rather
-- than forcing a backfill; "required" for new submissions is enforced by
-- the Zod schema + API validation in the app layer.
alter table public.vehicles
  add constraint vehicles_fuel_type_check
    check (fuel_type is null or fuel_type in ('Petrol', 'Diesel', 'CNG', 'LPG', 'Electric', 'Hybrid', 'Hydrogen')),
  add constraint vehicles_transmission_check
    check (transmission is null or transmission in (
      'Manual', 'Automatic (AT)', 'AMT', 'CVT', 'DCT', 'iMT', 'Tiptronic', 'Sequential', 'Semi-Automatic'
    ));
