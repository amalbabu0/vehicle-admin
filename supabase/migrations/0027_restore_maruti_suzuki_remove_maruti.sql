-- Correction to 0026: that migration removed "Maruti Suzuki", but the
-- brand meant to go was a separate plain "Maruti" entry (slug 'maruti'),
-- not "Maruti Suzuki". This migration is self-correcting either way:
--   1. Re-adds "Maruti Suzuki" if 0026 already ran and removed it —
--      on conflict do nothing makes this a harmless no-op otherwise.
--   2. Removes "Maruti" (exact slug 'maruti' only — does not match/touch
--      'maruti-suzuki').
-- Same ON DELETE SET NULL safety as 0026: any existing listing under the
-- "Maruti" brand keeps its own name/model text and just loses the brand
-- join, nothing is deleted or blocked.
insert into public.brands (name, slug)
values ('Maruti Suzuki', 'maruti-suzuki')
on conflict (slug) do nothing;

delete from public.brands where slug = 'maruti';
