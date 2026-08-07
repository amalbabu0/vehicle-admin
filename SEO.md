# SEO

Two requirements drive this: the public app must be **fast** and **discoverable**.
Both point to the same technique — server-rendered / pre-rendered HTML — so they
collapse into one architectural choice. (The admin app wants the exact opposite; see
the bottom.)

## The one non-negotiable: render HTML on the server

Search engines and social link-preview crawlers need the content **already in the
HTML** when the page arrives. A plain client-side single-page app (vanilla React/Vue)
ships a near-empty HTML shell and fills it in with JavaScript afterward — so a crawler
often sees a blank page. **This is the most common SEO mistake with modern frontends.**

The fix is server-rendered or pre-rendered HTML. And since this is a mostly-static,
rarely-changing catalog, that's the *ideal* case: pre-build the pages and let the CDN
serve them. Fast and SEO-correct at once.

## Framework choice

| Framework | Best when | Notes |
|-----------|-----------|-------|
| **Next.js (React)** | You want one versatile tool for everything | SSR + pre-render, ISR ("rebuild page on edit" — ties into the admin→public refresh signal), built-in image optimization, can host the inquiry API in the same app. Largest ecosystem. Safe default. |
| **Astro** | The app is mostly content with a little interactivity | Ships zero JS by default, hydrates only the interactive bits — very light and fast for a catalog. Less suited if the app later grows lots of app-like interactivity. |

For a vehicle catalog (browse, view, contact), **Astro is arguably the better technical
fit**, but **Next.js is the more versatile default** — especially if you'll add
favorites, richer user accounts, or a dashboard. Either is a good choice; neither is a
mistake.

*(If you use Astro, the inquiry endpoint may live as a small serverless function rather
than a built-in API route — still in the same Vercel project, not a separate repo.)*

## On-page SEO essentials

- **Per-page meta tags.** Each vehicle page needs its own `<title>` and meta
  description (e.g. *"2019 Honda Civic — 40k km — ₹X"*). With thousands of unique
  listing pages, generic site-wide tags are a wasted opportunity.
- **Open Graph tags.** So shared links (WhatsApp, social) show a photo and details
  instead of a bare URL — big for click-through on a listings site.
- **Structured data (JSON-LD).** Mark up each vehicle with schema.org `Vehicle` /
  `Product` data (price, mileage, condition). This is what lets Google show rich
  results, and it genuinely helps a listings site.
- **Sitemap + robots.txt.** Auto-generate a `sitemap.xml` of all listing URLs so
  crawlers find every vehicle. Easy to generate, easy to forget.
- **Clean, readable URLs.** `/vehicles/2019-honda-civic-xyz`, not `/listing?id=8412`.
  Better for users and for SEO. (This is why `vehicles` has a `slug` column.)
- **Image weight** feeds Core Web Vitals, which feed ranking — see `PERFORMANCE.md`.

## Domain strategy

### Free `.vercel.app` subdomain

- **It can be indexed.** Vercel only auto-applies `noindex` to the *temporary
  per-deployment* URLs; your assigned **production** `.vercel.app` domain is left
  indexable. So launching on it will not kill your SEO.
- **But it's not ideal for a public business:**
  - You're building on **shared, rented land** — `.vercel.app` is one domain shared by
    thousands of projects; you don't control the root.
  - **Lower trust / click-through** — users trust `carfinder.com` over
    `carfinder.vercel.app` for a real platform.
  - **Migration penalty** — moving to a custom domain later, search engines treat it as
    a brand-new site and you **restart SEO authority from scratch**.

### Recommendation

Launching the public app on a free `.vercel.app` subdomain is a legitimate way to ship
and validate the idea. But a **custom domain (~$10–15/year)** is the better long-term
home for something you're optimizing for SEO — better trust, and no painful SEO reset.
Because of the migration penalty, it's cheaper (in SEO terms) to **start** on your own
domain than to switch after you've built up rankings.

### If you do start on `.vercel.app` and plan to move later

Put **canonical tags** in place *before* the move so search engines have a consistent
signal, and be ready to set up proper redirects when you switch. This makes the
transition as clean as possible (though some authority reset is unavoidable).

## The admin app: the opposite of SEO

The admin app should be **deliberately invisible** to search — an admin login page in
Google results is pure downside (it advertises the door and draws probing bots, with
zero upside; no real user searches for your admin panel).

- Serve `X-Robots-Tag: noindex` on the whole admin app.
- **Don't** use `robots.txt` "Disallow" instead — that only stops crawling; a blocked
  page can still be indexed if linked, and blocking the crawl means the `noindex` is
  never seen. Correct combo: **crawlable + `noindex` header**. The login wall also
  keeps crawlers out of the content.

See `SECURITY.md` for the full admin-app hardening.

---

## Status in this codebase (vehicle-user / vehicle-admin)

- ✅ Next.js App Router with Server Components — HTML is server-rendered, not a blank SPA shell.
- ✅ Per-page metadata, Open Graph, Twitter Cards, canonical URLs on the homepage and every `/vehicles/[slug]` page.
- ✅ JSON-LD: `Organization`, `WebSite`+`SearchAction`, `BreadcrumbList`, `Vehicle` (with `Offer`/price).
- ✅ `sitemap.ts` / `robots.ts` in the user app.
- ✅ Clean slugs: `/vehicles/[slug]`, not a query-param id.
- ✅ Custom domain already in place (`keralaleasehub.online` / `ctl.keralaleasehub.online`) — not on `.vercel.app`.
- ⚠️ Admin noindex is currently a `<meta name="robots">` tag only (`admin/app/layout.tsx`), not an `X-Robots-Tag` HTTP header — the header is the more robust mechanism this doc calls for. Tracked as a fix.
