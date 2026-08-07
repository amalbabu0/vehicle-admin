-- Performance audit (see PERFORMANCE_STANDARDS.md #2): index columns used
-- in the public search page's filter sidebar and admin queries that don't
-- already have one. vehicles already has indexes on brand_id, category_id,
-- location_id, status, and a partial (status = 'published', published_at)
-- index for the public feed — this adds the remaining frequently-filtered
-- columns.

-- Fixed-set equality filters (fuel type / transmission dropdowns, year).
create index if not exists vehicles_fuel_type_idx on public.vehicles (fuel_type);
create index if not exists vehicles_transmission_idx on public.vehicles (transmission);
create index if not exists vehicles_registration_year_idx on public.vehicles (registration_year);

-- Price-range filter (minPrice/maxPrice) is a range scan, not equality.
create index if not exists vehicles_lease_amount_idx on public.vehicles (lease_amount);

-- name/model/condition are searched with ILIKE '%term%' (lib/data/search.ts's
-- `q` and `condition` filters) — a plain btree index can only serve prefix
-- matches ('term%'), not a leading wildcard, so this needs pg_trgm's GIN
-- trigram index instead.
create extension if not exists pg_trgm;
create index if not exists vehicles_name_trgm_idx on public.vehicles using gin (name gin_trgm_ops);
create index if not exists vehicles_model_trgm_idx on public.vehicles using gin (model gin_trgm_ops);
create index if not exists vehicles_condition_trgm_idx on public.vehicles using gin (condition gin_trgm_ops);

-- District -> taluk lookups (resolveDistrictLocationIds in search.ts,
-- browse-by-district). Small table today, but the FK has no index yet.
create index if not exists locations_parent_location_id_idx on public.locations (parent_location_id);
