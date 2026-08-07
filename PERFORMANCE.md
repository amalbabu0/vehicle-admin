# Performance

The app is **read-heavy and write-rare**, which is the ideal case for speed: content
barely changes, so caching works almost perfectly. Optimize in this order of impact.

## 1. Images — the #1 factor

A vehicle site is image-heavy (many photos per listing, viewed repeatedly). Caching
makes *repeat* views fast, but the *first* view depends on how heavy each image is.
Phone photos are often 3–8 MB each, and a grid might show 20 at once.

Fix it at **upload time**:

- **Resize and compress on upload — never serve the original.** Generate a few sizes:
  a small thumbnail for the grid, a medium for the detail page, a larger one only for zoom.
- **Use modern formats** — WebP or AVIF are dramatically smaller than JPEG at equal quality.
- **Lazy-load** below-the-fold images (`loading="lazy"`) so a grid only fetches what's on screen.
- **Reserve space** for each image (set width/height or an aspect-ratio box) so the
  page doesn't jump as photos load — layout shift hurts both experience and Core Web Vitals.

If you don't want to build the resize pipeline yourself, Cloudflare offers on-the-fly
image resizing/transforms from your R2 originals. Next.js also has built-in image
optimization that handles much of the resizing/format work.

## 2. Caching layers

### Edge / CDN caching for images — biggest win, effectively free

Put Cloudflare's CDN in front of R2. Images never change once uploaded and are viewed
over and over, so the CDN serves them from a location near each visitor — fast
globally — instead of hitting your bucket every time. Bonus: a cached image doesn't
trigger a Class B read on R2, keeping your op counts (and bill) low. Cloudflare CDN
caching is included on the free plan.

### Browser caching — set it and forget it

Tell browsers to keep static files locally. Since a photo at a given URL is permanent,
use a long `Cache-Control: max-age` (up to a year) with `immutable`. Do the same for
CSS/JS. This is just HTTP headers — no service, no cost.

### Data / query caching (Redis) — once you have traffic

This caches *database work*, not files. Cache the expensive, repeated queries: the
homepage feed, popular search/filter combinations, and reference data (the list of
makes/models/categories, which barely changes and can be cached aggressively). Store
the result with a TTL so the next visitor gets it instantly.

**Upstash** fits well (serverless, HTTP API — works even on Cloudflare Workers, which
block raw TCP). It scales to zero when idle, so low-traffic periods cost nothing. Use
it for caching **and** login rate-limiting.

> For a single-publisher catalog where listings change rarely, you may not need Redis
> at first — long-lived page/CDN caching covers most of it. Treat Redis as "add when
> traffic shows up," not "must-have on day one."

### Full-page caching — later, if needed

For pages that rarely change (a listing detail page), cache the fully rendered HTML at
the edge with a short TTL. Most sites don't need this until traffic is significant.

### Cache invalidation — the part that bites

Serving stale data is the classic bug, and here it spans **two apps**: the public app
caches, but the admin app is what changes the data. Two habits:

- **Versioned image URLs.** When a photo is replaced, give it a new filename/key rather
  than overwriting. The old URL stays cached harmlessly; the new one is fetched fresh —
  no purge needed.
- **Key Redis entries by listing ID** and delete/update them on edit, with TTLs short
  enough (minutes for search results) that anything missed self-corrects. Plus the
  admin→public revalidation signal described in `ARCHITECTURE.md`.

## 3. Database

A search that's instant with 500 listings can crawl at 50,000 if the DB isn't set up
right. (For a single-publisher catalog you're likely in the tens-to-hundreds range, so
this is more "good habits" than "urgent" — but the habits are cheap.)

- **Indexes are the biggest lever.** Add them to every column you filter or sort on:
  make, model, year, price, location, date posted. For common combinations (make +
  price range), use a composite index.
- **Avoid the N+1 problem** — don't fetch 20 listings and then fire 20 more queries for
  each one's images. Fetch related data in one go.
- **Select only the columns you need.** A grid doesn't need every row's full description.
- **Connection pooling** — route both apps through Supabase's pooler, especially since
  they're serverless, so you reuse connections instead of opening one per request. This
  is the single most likely thing to bite first under concurrency.

## 4. Pagination — never load everything

Load listings in pages or via infinite scroll, not all at once.

- The common `LIMIT/OFFSET` approach slows down as users page deep, because the DB
  still walks past all skipped rows.
- **Cursor (keyset) pagination** — "give me the next 20 after this listing" — stays
  fast at any depth. Worth using from the start on the main browse/search results.

*(Note: at single-publisher scale this matters less than in a huge marketplace, but
cursor pagination costs little to adopt early.)*

## 5. Search

Filtering is the core action.

- Simple `WHERE make = ...` queries are fine early.
- Fuzzy text search with `LIKE` gets slow and gives poor results. Start with
  **Postgres full-text search** (built in, free, good for a long time).
- Only reach for a dedicated engine (Meilisearch, Typesense, Algolia) if search
  actually becomes a bottleneck.
- **Debounce** the search box so you don't fire a query on every keystroke.

## 6. Frontend delivery

- **Compression** — ensure assets are served with Brotli or gzip. Big, easy win.
- **Keep the JS bundle small** — code-split so a visitor downloads only what the
  current page needs.
- **Limit third-party scripts** — analytics, chat widgets, and ad scripts are among the
  biggest silent slowdowns.
- **Server-render / pre-render** listing pages (see `SEO.md`) — this is both the fast
  option and the SEO-correct one; the two goals collapse into one technique here.

## 7. Rendering strategy (ties speed + SEO together)

Because content changes rarely, **static generation is close to ideal**: pre-build
listing pages and serve them instantly from the CDN, regenerating a page only when the
lister updates that vehicle (ISR — incremental static regeneration, in Next.js terms).
It's faster, cheaper, and simpler than querying the database on every visit, and it
sidesteps most caching complexity. This is why the framework choice (Next.js/Astro)
matters — see `SEO.md`.

## 8. Backend patterns

- **Move slow work off the request.** On upload, don't make the lister wait while you
  resize six images and send emails — hand it to a background job and return immediately.
- **Don't over-fetch in APIs.** Send the client exactly what the screen needs.

## 9. Measure, don't guess

- Run pages through **Lighthouse** (in Chrome) or **PageSpeed Insights** for real bottlenecks.
- Turn on the database's **slow-query log** to catch queries that need an index.
- Watch **Core Web Vitals** (LCP, CLS, INP) — they also feed search ranking.

Optimizing by feel usually means polishing things that were already fast.

## Priority order (for this project)

1. **Image optimization** — biggest, most visible impact.
2. **CDN in front of images** + long browser-cache headers — day one, free.
3. **Static generation / SSR** of listing pages — fast and SEO-correct.
4. **Database indexes** + connection pooler.
5. **Cursor pagination** on browse/search.
6. **Redis** (caching + rate-limiting) once traffic appears.
7. **Dedicated search engine** only if/when search becomes a bottleneck.

---

## Status in this codebase (vehicle-user / vehicle-admin)

See also `PERFORMANCE_STANDARDS.md` for the short enforcement checklist (N+1,
indexing, pagination, code-splitting) Claude verifies against on every change.

- ✅ Images: WebP conversion + EXIF strip at upload (admin), `Cache-Control: public,
  max-age=31536000, immutable`, unique-per-upload keys (never overwrites a cached
  URL), `next/image` for on-demand responsive resizing on the read side.
- ✅ CDN in front of R2 via a Cloudflare custom domain.
- ✅ Rendering: Server Components throughout; `revalidate = 120` (time-based ISR) on
  the vehicle detail page.
- ✅ DB indexes on every filter/sort column actually used (brand, category, location,
  status, fuel type, transmission, year, price range, plus trigram indexes for the
  ILIKE text search) — see vehicle-admin migrations 0001–0014.
- ✅ N+1 audited — none found; list queries batch via `.in()`/joins or a single
  aggregate RPC.
- ✅ Search-box debounce (400ms) on the filter sidebar.
- ✅ Redis (Upstash) already wired for auth rate-limiting.
- ⚠️ Pagination is currently offset-based (`.range()`) on `/vehicles` search and
  `/favorites`, not cursor-based. Tracked as a fix — matters less at this project's
  scale but is cheap to adopt early per this doc's own note.
- ⚠️ No on-demand revalidation signal from admin edits yet — the public vehicle page
  relies on the 120s time-based window rather than an instant admin→public refresh.
  Tracked as a fix.
- ➖ Connection pooling: not applicable as currently built — both apps talk to
  Postgres exclusively through Supabase's REST API (PostgREST), never a raw
  `postgres://` connection, so there's no app-held connection pool to route through a
  pooler.
- ➖ Postgres full-text search: not adopted — trigram (`pg_trgm`) indexes were used
  instead for the ILIKE search, which is actually a closer fit for typo-tolerant
  substring matching on short fields (brand/model) than `tsvector` ranking would be at
  this catalog size. Revisit if `q` search needs relevance ranking later.
