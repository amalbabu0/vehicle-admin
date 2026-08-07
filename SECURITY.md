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
- ✅ **Rate limiting exists on login/register/forgot-password** — 5 attempts per 5
  minutes per IP via Upstash (`lib/rate-limit.ts`, `authRateLimit`), checked before
  Turnstile verification and before the Supabase auth call in every auth Server Action.
- ⚠️ **Known gap, not yet fixed**: rate limiting is keyed by IP only, not by the
  target email — a distributed attacker (many IPs) can still grind one specific
  account's password, since each IP gets its own 5-attempt budget. Flagged in an
  earlier `/security-review` pass; not yet actioned. Fix: add a second rate-limit key
  on the normalized email (`login:email:${email}`) alongside the IP-based one.
- ⚠️ **Known gap, not yet fixed**: the admin login page ran the password check
  (`signInWithPassword`) *before* the admin/lister role check, so a correct-password/
  wrong-role attempt gets a different error message than a wrong-password attempt —
  turning the admin login page into an oracle for validating stolen/guessed
  credentials against the whole shared user base (not just admin accounts), without
  granting any actual admin access. Also flagged earlier, not yet actioned.
- ⚠️ **Known gap, not yet fixed**: the user app's `/register` returns Supabase's raw
  `error.message` on failure, which leaks whether an email is already registered
  (account enumeration) — `forgotPassword` already avoids this correctly with a
  generic message; `register` should match that pattern.

See the admin-app-specific `noindex` hardening in `SEO.md`.
