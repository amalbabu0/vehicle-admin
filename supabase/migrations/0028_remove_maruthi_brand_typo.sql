-- A third "maruti" variant — lowercase "maruthi" (slug 'maruthi'),
-- distinct from both 'maruti' (already removed by 0027) and
-- 'maruti-suzuki' (kept). Almost certainly auto-created via a lister
-- typing "maruthi" as a free-text brand (Combobox allowCustomValue +
-- auto-create in lib/vehicles/references.ts). Same ON DELETE SET NULL
-- safety as 0026/0027 — no listings are deleted or blocked.
delete from public.brands where slug = 'maruthi';
