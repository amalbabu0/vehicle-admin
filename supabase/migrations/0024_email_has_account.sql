-- User app login needs to show "Account doesn't exist. Please register."
-- distinctly from a wrong-password error — this is a deliberate product
-- choice (see the user-app login form) that trades a small amount of
-- account-enumeration surface for that UX, made consciously aware of the
-- tradeoff. This function is the "safest implementation" version of that
-- lookup: SECURITY DEFINER only to read auth.users (not otherwise
-- queryable by anon/authenticated), returns a single boolean and nothing
-- else — no email, no id, no metadata. The caller (login()) still gates
-- this behind the existing IP rate limit + Turnstile check before ever
-- reaching it.
create or replace function public.email_has_account(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from auth.users where lower(email) = lower(p_email));
$$;

grant execute on function public.email_has_account(text) to anon, authenticated;
