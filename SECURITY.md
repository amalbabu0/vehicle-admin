# Security

Common security holes in AI-generated login screens (via Hayden Smith) — two of
five, documented here:

## Cross-site scripting (XSS) from localStorage tokens

Happens when the app stores authentication tokens in the browser's `localStorage`. If
an attacker injects malicious JavaScript through another vulnerability, that script
can read the token from `localStorage` and send it to their server, letting them
impersonate the user. It's safer to use **httpOnly cookies**, since JavaScript can't
access them.

## Missing rate limiting on the login endpoint

Means there's no restriction on how many login attempts someone can make. Attackers
can run automated password-guessing or credential-stuffing attacks without being
blocked, which makes brute-force attacks much easier. Adding rate limits or temporary
lockouts after several failed attempts helps prevent this.

---

## Status in this codebase (vehicle-admin / vehicle-user)

- ✅ **No localStorage tokens.** Both apps use `@supabase/ssr`'s cookie-based session
  handling exclusively (`createServerClient`/`createBrowserClient` with httpOnly
  session cookies) — there is no `localStorage.setItem` anywhere in either app's auth
  code. Not a risk here.
- ✅ **Rate limiting on login/register/forgot-password/OTP-verify** — 5 attempts per 5
  minutes via Upstash (`lib/rate-limit.ts`), checked before Turnstile verification and
  before the Supabase auth call in every auth Server Action. Keyed on **both** the
  caller's IP and the normalized target email (`checkAuthRateLimit`), so either budget
  running out blocks the attempt.
- ✅ **Closed: IP-only rate-limit keys.** Previously an attacker with many IPs could
  grind one account, each IP getting a fresh 5-attempt budget. The user app closed this
  first; the admin app was still IP-only on `login`/`forgot` and email-only on
  `otp-verify` until a later pass brought it to parity. This mattered more on the admin
  side, because that login reveals when a password is correct — a wrong one returns
  "Incorrect email or password", a right one returns the OTP form — so unlimited
  attempts could confirm an admin's password outright, leaving only the emailed code
  in the way.
- ✅ **Closed: the admin login credential oracle.** The role check and the
  admin-email allow-list check now both return the *same* message as the
  wrong-password branch, and the session created by `signInWithPassword` is signed
  out immediately, so a correct password alone never leaves a usable session.
- ✅ **Closed: `/register` account enumeration.** The user app's `register()` now
  returns one generic message on every failure, matching `forgotPassword()`, instead
  of Supabase's raw `error.message`.
- ✅ **Second factor on the admin app.** Every `admin_profiles` account (admin *and*
  lister) must pass an emailed OTP after the password; the password-stage session is
  discarded before the code is sent.
- ✅ **Authorization on every admin API route.** Audited route-by-route: all mutating
  routes call `requireAdmin`/`requireAdminOrLister`, the cron route checks
  `CRON_SECRET`, and `/api/public-config` is intentionally unguarded (it serves only
  the anon-key-level values the browser already receives).
- ✅ **No BOLA on vehicle mutations.** `requireAdminOrLister()` gates by role only, but
  the routes use the cookie-bound RLS client rather than the service-role client, and
  `vehicles_update_own` scopes UPDATE to `lister_id = auth.uid()` (admins via
  `is_admin()`), so one lister cannot modify another's listing.
- ⚠️ **Note on the public login's deliberate enumeration tradeoff.** The *user* app's
  `login()` still distinguishes "account doesn't exist" from "wrong password" on
  purpose, for clearer UX. That is a conscious product decision, documented at the
  call site, and is bounded by Turnstile plus the IP+email rate limit.

See the admin-app-specific `noindex` hardening in `SEO.md`.
