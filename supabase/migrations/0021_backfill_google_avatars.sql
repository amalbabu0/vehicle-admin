-- One-time backfill for accounts that signed up via Google before 0020
-- fixed handle_new_user() to capture avatar_url — their photo was already
-- sitting in auth.users.raw_user_meta_data the whole time, just never
-- copied over. Only touches rows that are currently null; never overwrites
-- a value a user may have set some other way.
update user_profiles up
set avatar_url = coalesce(au.raw_user_meta_data ->> 'avatar_url', au.raw_user_meta_data ->> 'picture')
from auth.users au
where au.id = up.id
  and up.avatar_url is null
  and coalesce(au.raw_user_meta_data ->> 'avatar_url', au.raw_user_meta_data ->> 'picture') is not null;
