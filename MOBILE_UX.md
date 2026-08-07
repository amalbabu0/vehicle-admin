# Mobile UX

Most classifieds traffic is mobile, so treat the phone as the **primary** design
target, not an afterthought. The whole viewer journey — browse → filter → view photos →
contact — happens on small screens, one-handed, often on slow connections.

## Design mobile-first

Design the phone layout first, then scale **up** to tablet/desktop. Designing for
desktop and squeezing down almost always produces a cramped, awkward mobile experience.

## Performance *is* UX on mobile

On a phone with patchy signal, speed is the experience. Everything in
`PERFORMANCE.md` — image optimization, lazy-loading, CDN, small JS bundles — is a
mobile-UX concern first. Specifically:

- Serve **appropriately sized images per screen**; a phone should never download a
  desktop-resolution photo.
- **Lazy-load** the listing grid so scrolling stays smooth and data isn't wasted.
- **Reserve image space** (aspect-ratio boxes) so the layout doesn't jump as photos
  load — layout shift is especially jarring on mobile and can cause mis-taps.
- Keep the initial payload light so the first screen paints fast.

## The browse / listing grid

- **1 column on phones, 2 on larger phones/tablets, more on desktop.** A single wide
  card per row reads best on a narrow screen.
- Each card shows the essentials only: **primary photo, price, make/model/year, key
  spec (mileage/fuel), location.** Don't crowd the card.
- Make the **whole card tappable**, not just a small link.
- **Infinite scroll** feels natural on mobile (over numbered pagination) — pair it with
  cursor pagination on the backend (see `PERFORMANCE.md`).
- Show a clear **loading state** (skeletons) so the app feels responsive on slow networks.

## Filters and search — the make-or-break interaction

Filtering is the core action, and it's where mobile classifieds succeed or frustrate.

- Put filters behind a **"Filters" button that opens a full-screen sheet/drawer**,
  rather than cramming controls into the header. Small screens have no room for an
  always-visible filter bar.
- Show an **"Apply" button** and a count ("Show 42 results") so users act deliberately
  rather than firing a query per change.
- Make the **active filters visible** (chips) with easy one-tap removal, so users always
  know what's applied.
- **Debounce** the text search; show results as they narrow.
- Keep filter inputs **touch-friendly** — range sliders and steppers for price/year,
  large tappable option lists rather than tiny dropdowns.

## The vehicle detail page

- **Photo gallery first.** Photos sell vehicles — put a large, **swipeable** gallery at
  the top with a photo count and swipe indicator. Allow **pinch-to-zoom**.
- Below it, **specs in a scannable layout** (price prominent, then a clean key-value
  list: year, mileage, fuel, transmission, condition, location).
- Description below the specs.
- **Keep the contact action always reachable** — a sticky "Contact owner" button
  pinned to the bottom of the viewport so the user never has to scroll back up to act.

## The contact flow (the conversion moment)

Since there are no payments, **contacting the owner is the single most important
action** on the site. Make it effortless.

- **Minimize friction.** A logged-in user should contact in as few taps as possible.
- Decide the mechanism deliberately (per the project's contact design): a short
  **inquiry form** (name auto-filled from their account, a message box), and/or a
  reveal of the owner's phone with **tap-to-call**.
- On mobile, offer **tap-to-call** and, if appropriate, a WhatsApp/SMS deep link —
  phone-native actions convert far better than a desktop-style form on mobile.
- After sending, show a **clear confirmation** ("Your message was sent") so the user
  isn't left guessing.

## Touch and ergonomics

- **Touch targets ≥ ~44×44px** with enough spacing to avoid mis-taps.
- Design for **one-handed use** — keep primary actions within thumb reach (bottom of
  the screen), not stranded in top corners.
- **Native inputs.** Use the right input types (`type="tel"`, `type="email"`,
  `type="number"`) so the correct on-screen keyboard appears.
- Avoid hover-dependent interactions — there is no hover on touch.

## Auth on mobile

- Keep **login/signup short** and forgiving. Supabase Auth handles the mechanics;
  the UX job is minimal fields and clear errors.
- Support **password managers / autofill** (correct input attributes).
- Consider whether viewers even need an account to browse — requiring login only at the
  *contact* step (rather than to view) lowers the barrier to entry. (Decide per the
  project's auth design.)

## Accessibility (helps everyone, especially on mobile)

- Sufficient **color contrast** for outdoor/sunlight viewing.
- **Legible base font size** (≥16px) so text is readable and iOS doesn't auto-zoom form fields.
- **Alt text** on vehicle images (also mildly helps SEO).
- Respect **reduced-motion** preferences.

## Quick checklist

- [ ] Designed mobile-first, scaled up
- [ ] Right-sized images per screen; lazy-loaded; reserved space
- [ ] 1-column tappable listing cards with essentials only
- [ ] Filters in a full-screen sheet with Apply + result count + active-filter chips
- [ ] Swipeable, zoomable photo gallery on the detail page
- [ ] Sticky, always-reachable "Contact owner" button
- [ ] Tap-to-call / low-friction contact; clear confirmation
- [ ] Touch targets ≥ 44px; one-handed reach; native input types
- [ ] ≥16px base font; good contrast; alt text

---

## Status in this codebase (vehicle-user / vehicle-admin)

- ✅ Listing grid: 1 col mobile → 2 (sm) → 3/4 (lg+), whole card tappable, skeleton
  loading states, infinite scroll on `/vehicles`.
- ✅ Filters: bottom-sheet drawer below `lg:`, active-filter count badge on the
  trigger button, debounced text search.
- ✅ Detail page: gallery at top (tap-to-switch thumbnails; no pinch-zoom/swipe yet —
  gap below), specs in a scannable key-value grid, description below specs.
- ✅ Contact: Call + WhatsApp buttons surfaced right under the gallery on
  mobile/tablet (not buried below the spec sheet) — not yet a viewport-pinned sticky
  bar, so still requires some scrolling on a long detail page. Gap below.
- ✅ Native input types (`type="tel"`, `type="email"`, `type="number"`) already used
  throughout the auth and filter forms.
- ✅ Base font size is the Tailwind default `text-sm`/`text-base` scale (≥16px for
  body text where it matters for iOS zoom).
- ⚠️ Gaps to close: swipe/pinch-zoom gallery gestures, a true viewport-pinned sticky
  contact bar (current version scrolls with content), image `alt` text audit, and an
  explicit `prefers-reduced-motion` check on the remaining CSS entrance animation.
