# Performance standards

Verify every code change against these four checks before considering it done. They apply to both apps (`vehicle-admin`, `vehicle-user`) — each repo keeps its own copy of this file (no shared package between the two).

## 1. No N+1 queries

Never fetch related data inside a loop — one DB call per item instead of one call for the whole list.

- **Bad**: `for (const vehicle of vehicles) { const brand = await supabase.from("brands").select().eq("id", vehicle.brand_id).single(); }`
- **Good**: collect all the ids first, fetch once with `.in("id", ids)`, then map in memory — or embed the relation directly in the original `select()` (e.g. `brands ( name )`) so PostgREST joins it in one round trip.
- Applies to any loop: `for`, `.map()`, `.forEach()`, `Promise.all(items.map(async ...))` around a per-item query is still N+1 (N parallel queries instead of 1).

## 2. Index columns used in frequent filters

Any column that shows up in a `.eq()`/`.in()`/`.gte()`/`.lte()`/`.ilike()` on a table with unbounded growth (vehicles, favorites, audit_logs, etc.) needs an index, added via a Supabase CLI migration:

```sql
create index if not exists <table>_<column>_idx on <table> (<column>);
```

- Composite indexes for queries that always filter on two columns together (e.g. `status` + `published_at` for the public feed) beat two single-column indexes.
- Partial indexes (`where status = 'published'`) are worth it when one value dominates the table and only that value is ever queried in bulk.
- Verify with `explain analyze` — look for `Index Scan`/`Index Only Scan` replacing `Seq Scan` on the filtered column. On very small tables Postgres may still choose a seq scan (it's genuinely cheaper below a certain row count) — that's correct planner behavior, not a failure to add the index.

## 3. No unbounded queries

Any endpoint or Server Component returning a list must paginate — never `select()` a whole table with no `.range()`/`.limit()`.

- Default page size: 20.
- Offset-based (`.range(from, to)` + a page number) is fine for admin tables with a "Previous/Next" UI.
- Cursor-based (`.lt("created_at", cursor)` ordered by an indexed column) is required for anything with infinite scroll or that can grow past a few thousand rows, since offset pagination gets slower (and can skip/duplicate rows under concurrent writes) as the offset grows.

## 4. Code splitting

Check the `next build` output — it prints a size per route. Don't ship a large client-only component (charts, carousels, rich editors, anything wrapping a big library) in the same bundle as the page shell if it's not needed for the initial paint.

- Use `next/dynamic` with `{ ssr: false }` for browser-only widgets (e.g. anything touching `navigator.share`, `IntersectionObserver`-driven UI) that don't need to render on the server.
- Use plain `next/dynamic` (SSR still on) for heavy-but-server-renderable components below the fold.
- Target: initial JS for a route stays under ~200KB gathered/first-load size as reported by `next build`. If a route exceeds it, find the heaviest import and lazy-load it.
