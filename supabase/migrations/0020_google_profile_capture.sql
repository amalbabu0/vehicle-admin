-- handle_new_user() (see 0004) only ever saved full_name — avatar_url was
-- silently dropped even though Google OAuth always provides one. Google's
-- Supabase identity data exposes it under either 'avatar_url' or 'picture'
-- depending on flow, so read both defensively.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$;

-- Google OAuth never provides a phone number (not in the default scope),
-- and doesn't ask consent for the name/photo it hands back on our behalf —
-- both are collected via a one-time /complete-profile step in the user app
-- right after a brand-new Google sign-up. Nullable/default-false: existing
-- rows and email/password signups (which don't go through that step) are
-- unaffected.
alter table user_profiles
  add column if not exists profile_image_consent boolean not null default false,
  add column if not exists profile_image_consent_at timestamptz;
