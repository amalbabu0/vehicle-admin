-- ============================================================================
-- Split the single `profiles` table into admin_profiles (admin/lister) and
-- user_profiles (user) — separate identity tables for the two apps, per
-- explicit request. Rewritten as a clean rebuild rather than an incremental
-- ALTER chain: no real accounts exist yet (admin-app registration was only
-- fixed minutes before this migration), and nearly every table's FKs need
-- to move, which is much safer to get right from a clean slate than via a
-- long ALTER/DROP CONSTRAINT chain.
--
-- Design:
--   - admin_profiles: id, role ('admin' | 'lister'), full_name, phone,
--     avatar_url. Only ever holds admin/lister accounts.
--   - user_profiles: id, full_name, phone, avatar_url. No role column —
--     existence in this table IS the "user" role. Only ever holds public
--     site accounts.
--   - Columns that can only ever belong to one side (vehicles.lister_id,
--     reports.reviewed_by, etc.) FK to the specific table. Columns where
--     either side can act (enquiry_messages.sender_id, notifications.user_id,
--     audit_logs.actor_id) FK to auth.users directly — Supabase supports
--     referencing auth.users(id) from public-schema tables, and it's the
--     one identity table both profile tables key off of.
--   - The admin email allowlist lives in site_settings (data), not a
--     literal in application or function code — is_admin() checks BOTH
--     role='admin' AND a live email match, so it's real defense-in-depth,
--     not just an app-layer login check.
-- ============================================================================

-- ---- Drop everything from 0001-0003 in dependency order --------------

drop policy if exists "audit_logs_select_admin" on audit_logs;
drop policy if exists "site_settings_select_public" on site_settings;
drop policy if exists "site_settings_write_admin" on site_settings;
drop policy if exists "reports_select_own_or_admin" on reports;
drop policy if exists "reports_insert_authenticated" on reports;
drop policy if exists "reports_update_admin" on reports;
drop policy if exists "notifications_select_own" on notifications;
drop policy if exists "notifications_update_own" on notifications;
drop policy if exists "enquiry_messages_select_participant" on enquiry_messages;
drop policy if exists "enquiry_messages_insert_participant" on enquiry_messages;
drop policy if exists "enquiries_select_participant" on enquiries;
drop policy if exists "enquiries_insert_user" on enquiries;
drop policy if exists "enquiries_update_participant" on enquiries;
drop policy if exists "favorites_all_own" on favorites;
drop policy if exists "vehicle_images_select_published_or_own" on vehicle_images;
drop policy if exists "vehicle_images_write_own_vehicle" on vehicle_images;
drop policy if exists "vehicles_select_published" on vehicles;
drop policy if exists "vehicles_select_own" on vehicles;
drop policy if exists "vehicles_select_admin" on vehicles;
drop policy if exists "vehicles_insert_lister" on vehicles;
drop policy if exists "vehicles_update_own" on vehicles;
drop policy if exists "vehicles_update_admin" on vehicles;
drop policy if exists "vehicles_delete_own_draft" on vehicles;
drop policy if exists "vehicles_delete_admin" on vehicles;
drop policy if exists "locations_select_public" on locations;
drop policy if exists "locations_write_admin" on locations;
drop policy if exists "categories_select_public" on categories;
drop policy if exists "categories_write_admin" on categories;
drop policy if exists "lookup_select_public" on brands;
drop policy if exists "lookup_write_admin" on brands;
drop policy if exists "profiles_select_own_or_admin" on profiles;
drop policy if exists "profiles_select_public" on profiles;
drop policy if exists "profiles_update_own" on profiles;
drop policy if exists "profiles_update_admin" on profiles;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.current_user_role();
drop function if exists public.current_role();
drop function if exists public.is_admin();
drop function if exists public.is_super_admin();
drop function if exists public.log_audit_event(text, text, uuid, jsonb);

drop table if exists audit_logs;
drop table if exists reports;
drop table if exists notifications;
drop table if exists enquiry_messages;
drop table if exists enquiries;
drop table if exists favorites;
drop table if exists vehicle_images;
drop table if exists vehicles;
drop table if exists locations;
drop table if exists categories;
drop table if exists brands;
drop table if exists site_settings;
drop table if exists profiles;

drop type if exists user_role;
drop type if exists vehicle_status;
drop type if exists enquiry_status;
drop type if exists notification_type;
drop type if exists report_reason;
drop type if exists report_status;

-- ---- New profile tables -------------------------------------------------

create type admin_role as enum ('admin', 'lister');

create table admin_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role admin_role not null,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger admin_profiles_set_updated_at
  before update on admin_profiles
  for each row execute function public.set_updated_at();

create trigger user_profiles_set_updated_at
  before update on user_profiles
  for each row execute function public.set_updated_at();

-- Self-service signup (user app only — the admin app has no register page,
-- admin/lister accounts are created manually, see bottom of this file)
-- always lands in user_profiles. Promoting someone to admin_profiles is a
-- separate, manual, privileged action — never automatic.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- Role helpers ---------------------------------------------------

-- The ONLY email allowed to exercise admin privileges, regardless of what
-- role admin_profiles says — stored as data (site_settings), never a
-- literal in app or function code. Change it with:
--   update site_settings set value = '"new-email@example.com"' where key = 'admin_email';
create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  allowed_email text;
begin
  select value #>> '{}' into allowed_email from site_settings where key = 'admin_email';

  return coalesce(
    (
      select ap.role = 'admin' and lower(u.email) = lower(allowed_email)
      from admin_profiles ap
      join auth.users u on u.id = ap.id
      where ap.id = auth.uid()
    ),
    false
  );
end;
$$;

-- Lister OR admin — used for "can manage vehicle listings" checks. Mere
-- existence in admin_profiles is sufficient (the table only ever holds
-- these two roles); the admin-email restriction above only gates the
-- *admin* role specifically, not lister.
create or replace function public.is_admin_or_lister()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admin_profiles where id = auth.uid());
$$;

create or replace function public.log_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata);
end;
$$;

-- ---- brands / categories / locations -------------------------------

create table brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_location_id uuid references locations (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---- vehicles ---------------------------------------------------------

create type vehicle_status as enum (
  'draft',
  'pending_approval',
  'published',
  'rejected',
  'archived',
  'sold'
);

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  lister_id uuid not null references admin_profiles (id) on delete cascade,

  brand_id uuid references brands (id) on delete set null,
  category_id uuid references categories (id) on delete set null,
  location_id uuid references locations (id) on delete set null,

  name text not null,
  slug text not null unique,
  status vehicle_status not null default 'draft',

  lease_amount numeric(12, 2) not null,
  lease_period text not null,
  service_charge_percent numeric(5, 2),
  direct_owner boolean not null default true,
  contact_phone text not null,
  description text not null,

  fuel_type text,
  transmission text,
  km_driven integer,
  registration_year integer,
  insurance_valid_until date,
  color text,
  engine_capacity text,
  seats integer,
  condition text,
  features text[] not null default '{}',

  view_count integer not null default 0,

  approved_by uuid references admin_profiles (id) on delete set null,
  approved_at timestamptz,
  rejected_reason text,
  published_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger vehicles_set_updated_at
  before update on vehicles
  for each row execute function public.set_updated_at();

create index vehicles_published_feed_idx
  on vehicles (published_at desc, id desc)
  where status = 'published';

create index vehicles_lister_id_idx on vehicles (lister_id);
create index vehicles_brand_id_idx on vehicles (brand_id);
create index vehicles_category_id_idx on vehicles (category_id);
create index vehicles_location_id_idx on vehicles (location_id);
create index vehicles_status_idx on vehicles (status);

create table vehicle_images (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  url text not null,
  is_cover boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index vehicle_images_vehicle_id_idx on vehicle_images (vehicle_id, sort_order);

-- ---- favorites (user_profiles only) ----------------------------------

create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles (id) on delete cascade,
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, vehicle_id)
);

create index favorites_user_id_idx on favorites (user_id);
create index favorites_vehicle_id_idx on favorites (vehicle_id);

-- ---- enquiries + enquiry_messages -------------------------------------
-- user_id is always a user_profiles person (the enquirer); lister_id is
-- always an admin_profiles person (who's being contacted). Messages can
-- come from either side, so sender_id FKs to auth.users directly.

create type enquiry_status as enum ('open', 'archived', 'closed');

create table enquiries (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  user_id uuid not null references user_profiles (id) on delete cascade,
  lister_id uuid not null references admin_profiles (id) on delete cascade,
  status enquiry_status not null default 'open',
  unread_count_user integer not null default 0,
  unread_count_lister integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vehicle_id, user_id)
);

create trigger enquiries_set_updated_at
  before update on enquiries
  for each row execute function public.set_updated_at();

create index enquiries_user_id_idx on enquiries (user_id);
create index enquiries_lister_id_idx on enquiries (lister_id);
create index enquiries_vehicle_id_idx on enquiries (vehicle_id);

create table enquiry_messages (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references enquiries (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index enquiry_messages_enquiry_id_idx on enquiry_messages (enquiry_id, created_at);

-- ---- notifications (either side) --------------------------------------

create type notification_type as enum (
  'new_enquiry',
  'enquiry_reply',
  'listing_approved',
  'listing_rejected',
  'listing_published',
  'listing_archived',
  'listing_sold',
  'system'
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on notifications (user_id, read_at, created_at desc);

-- ---- reports ------------------------------------------------------------
-- reporter can be either side (a user reporting a listing, or an admin/
-- lister flagging something) so reporter_id -> auth.users; reviewed_by is
-- always an admin action -> admin_profiles.

create type report_reason as enum (
  'spam',
  'duplicate',
  'fake_listing',
  'wrong_price',
  'already_sold',
  'incorrect_information'
);

create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table reports (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason report_reason not null,
  details text,
  status report_status not null default 'open',
  reviewed_by uuid references admin_profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index reports_vehicle_id_idx on reports (vehicle_id);
create index reports_status_idx on reports (status);

-- ---- audit_logs (either side) ------------------------------------------

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_logs_actor_id_idx on audit_logs (actor_id);
create index audit_logs_entity_idx on audit_logs (entity_type, entity_id);
create index audit_logs_created_at_idx on audit_logs (created_at desc);

-- ---- site_settings ------------------------------------------------------

create table site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger site_settings_set_updated_at
  before update on site_settings
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table admin_profiles enable row level security;
alter table user_profiles enable row level security;
alter table brands enable row level security;
alter table categories enable row level security;
alter table locations enable row level security;
alter table vehicles enable row level security;
alter table vehicle_images enable row level security;
alter table favorites enable row level security;
alter table enquiries enable row level security;
alter table enquiry_messages enable row level security;
alter table notifications enable row level security;
alter table reports enable row level security;
alter table audit_logs enable row level security;
alter table site_settings enable row level security;

-- ---- admin_profiles ----------------------------------------------------
-- No public SELECT: vehicles.contact_phone already carries the display
-- contact info, so the public site never needs to read this table.
-- No INSERT policy at all: creating an admin/lister account is a manual,
-- privileged action (service-role client or direct SQL), never something
-- the anon-key client can do to itself.

create policy "admin_profiles_select_own_or_admin"
  on admin_profiles for select
  using (id = auth.uid() or is_admin());

create policy "admin_profiles_update_own"
  on admin_profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select ap.role from admin_profiles ap where ap.id = auth.uid())
  );

create policy "admin_profiles_update_admin"
  on admin_profiles for update
  using (is_admin());

-- ---- user_profiles -------------------------------------------------------

create policy "user_profiles_select_own_or_admin"
  on user_profiles for select
  using (id = auth.uid() or is_admin());

create policy "user_profiles_update_own"
  on user_profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---- brands / categories / locations ------------------------------------

create policy "lookup_select_public" on brands for select using (true);
create policy "lookup_write_admin" on brands for all
  using (is_admin()) with check (is_admin());

create policy "categories_select_public" on categories for select using (true);
create policy "categories_write_admin" on categories for all
  using (is_admin()) with check (is_admin());

create policy "locations_select_public" on locations for select using (true);
create policy "locations_write_admin" on locations for all
  using (is_admin()) with check (is_admin());

-- ---- vehicles ------------------------------------------------------------

create policy "vehicles_select_published"
  on vehicles for select
  using (status = 'published');

create policy "vehicles_select_own"
  on vehicles for select
  using (lister_id = auth.uid());

create policy "vehicles_select_admin"
  on vehicles for select
  using (is_admin());

create policy "vehicles_insert_lister"
  on vehicles for insert
  with check (lister_id = auth.uid() and is_admin_or_lister());

create policy "vehicles_update_own"
  on vehicles for update
  using (lister_id = auth.uid())
  with check (lister_id = auth.uid());

create policy "vehicles_update_admin"
  on vehicles for update
  using (is_admin());

create policy "vehicles_delete_own_draft"
  on vehicles for delete
  using (lister_id = auth.uid() and status = 'draft');

create policy "vehicles_delete_admin"
  on vehicles for delete
  using (is_admin());

-- ---- vehicle_images --------------------------------------------------

create policy "vehicle_images_select_published_or_own"
  on vehicle_images for select
  using (
    exists (
      select 1 from vehicles v
      where v.id = vehicle_images.vehicle_id
        and (v.status = 'published' or v.lister_id = auth.uid())
    )
    or is_admin()
  );

create policy "vehicle_images_write_own_vehicle"
  on vehicle_images for all
  using (
    exists (
      select 1 from vehicles v
      where v.id = vehicle_images.vehicle_id and v.lister_id = auth.uid()
    )
    or is_admin()
  )
  with check (
    exists (
      select 1 from vehicles v
      where v.id = vehicle_images.vehicle_id and v.lister_id = auth.uid()
    )
    or is_admin()
  );

-- ---- favorites -------------------------------------------------------

create policy "favorites_all_own"
  on favorites for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- enquiries ---------------------------------------------------------

create policy "enquiries_select_participant"
  on enquiries for select
  using (user_id = auth.uid() or lister_id = auth.uid() or is_admin());

create policy "enquiries_insert_user"
  on enquiries for insert
  with check (user_id = auth.uid());

create policy "enquiries_update_participant"
  on enquiries for update
  using (user_id = auth.uid() or lister_id = auth.uid() or is_admin());

-- ---- enquiry_messages --------------------------------------------------

create policy "enquiry_messages_select_participant"
  on enquiry_messages for select
  using (
    exists (
      select 1 from enquiries e
      where e.id = enquiry_messages.enquiry_id
        and (e.user_id = auth.uid() or e.lister_id = auth.uid())
    )
    or is_admin()
  );

create policy "enquiry_messages_insert_participant"
  on enquiry_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from enquiries e
      where e.id = enquiry_messages.enquiry_id
        and (e.user_id = auth.uid() or e.lister_id = auth.uid())
    )
  );

-- ---- notifications -------------------------------------------------------

create policy "notifications_select_own"
  on notifications for select
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No direct INSERT policy — notifications are created by trusted
-- server-side code using the service-role client.

-- ---- reports -------------------------------------------------------------

create policy "reports_select_own_or_admin"
  on reports for select
  using (reporter_id = auth.uid() or is_admin());

create policy "reports_insert_authenticated"
  on reports for insert
  with check (reporter_id = auth.uid());

create policy "reports_update_admin"
  on reports for update
  using (is_admin());

-- ---- audit_logs ------------------------------------------------------

create policy "audit_logs_select_admin"
  on audit_logs for select
  using (is_admin());

-- ---- site_settings ---------------------------------------------------

create policy "site_settings_select_public"
  on site_settings for select
  using (true);

create policy "site_settings_write_admin"
  on site_settings for all
  using (is_admin())
  with check (is_admin());
