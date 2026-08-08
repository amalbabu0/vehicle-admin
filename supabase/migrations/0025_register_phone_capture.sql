-- The user app's registration form now collects a phone number too (in
-- addition to full_name, already handled here since 0020) — same
-- mechanism: no session exists yet at signup time (email confirmation is
-- required), so it travels through raw_user_meta_data rather than a
-- direct RLS-scoped update. Existing Google-only accounts already collect
-- phone via the separate /complete-profile step, unaffected by this —
-- this only changes what a brand-new email/password signup captures.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name, avatar_url, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;
