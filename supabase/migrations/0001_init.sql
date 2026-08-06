-- ============================================================================
-- Vehicle Listing Platform — initial schema
-- ============================================================================
-- Roles: admin, lister, user.
-- RLS is the real security boundary throughout — never rely on app-layer
-- checks alone. Both apps connect with the SAME anon key; what differs is
-- which role is signed in and what RLS grants that role.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- Enums
-- ============================================================================

create type user_role as enum ('admin', 'lister', 'user');

create type vehicle_status as enum (
  'draft',
  'pending_approval',
  'published',
  'rejected',
  'archived',
  'sold'
);

create type report_reason as enum (
  'spam',
  'duplicate',
  'fake_listing',
  'wrong_price',
  'already_sold',
  'incorrect_information'
);

create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create type enquiry_status as enum ('open', 'archived', 'closed');

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

-- ============================================================================
-- Helper functions
-- ============================================================================

-- Auto-maintain updated_at columns.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- SECURITY DEFINER so RLS on profiles doesn't recurse into itself when
-- other tables' policies call this to check the caller's role.
--
-- language plpgsql (not sql) deliberately: plpgsql function bodies aren't
-- validated against real tables until first execution, whereas `language
-- sql` bodies are parsed at CREATE FUNCTION time — and profiles doesn't
-- exist yet at this point in the script. This ordering trick avoids having
-- to move these below every table they might reference.
create or replace function public.current_user_role()
returns user_role
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return (select role from profiles where id = auth.uid());
end;
$$;

create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return coalesce(
    (select role = 'admin' from profiles where id = auth.uid()),
    false
  );
end;
$$;

-- ============================================================================
-- profiles — one row per auth.users row, created automatically on signup.
-- ============================================================================

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'user',
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- brands / categories / locations — admin-managed lookup tables
-- ============================================================================

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

-- ============================================================================
-- vehicles
-- ============================================================================

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  lister_id uuid not null references profiles (id) on delete cascade,

  brand_id uuid references brands (id) on delete set null,
  category_id uuid references categories (id) on delete set null,
  location_id uuid references locations (id) on delete set null,

  name text not null,
  slug text not null unique,
  status vehicle_status not null default 'draft',

  -- Required fields
  lease_amount numeric(12, 2) not null,
  lease_period text not null,
  service_charge_percent numeric(5, 2),
  direct_owner boolean not null default true,
  contact_phone text not null,
  description text not null,

  -- Optional spec fields
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

  approved_by uuid references profiles (id) on delete set null,
  approved_at timestamptz,
  rejected_reason text,
  published_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger vehicles_set_updated_at
  before update on vehicles
  for each row execute function public.set_updated_at();

-- Cursor-paginated public feed: published listings, newest first.
create index vehicles_published_feed_idx
  on vehicles (published_at desc, id desc)
  where status = 'published';

create index vehicles_lister_id_idx on vehicles (lister_id);
create index vehicles_brand_id_idx on vehicles (brand_id);
create index vehicles_category_id_idx on vehicles (category_id);
create index vehicles_location_id_idx on vehicles (location_id);
create index vehicles_status_idx on vehicles (status);

-- ============================================================================
-- vehicle_images
-- ============================================================================

create table vehicle_images (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  url text not null,
  is_cover boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index vehicle_images_vehicle_id_idx on vehicle_images (vehicle_id, sort_order);

-- ============================================================================
-- favorites
-- ============================================================================

create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, vehicle_id)
);

create index favorites_user_id_idx on favorites (user_id);
create index favorites_vehicle_id_idx on favorites (vehicle_id);

-- ============================================================================
-- enquiries + enquiry_messages (realtime chat)
-- ============================================================================

create table enquiries (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  lister_id uuid not null references profiles (id) on delete cascade,
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
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index enquiry_messages_enquiry_id_idx on enquiry_messages (enquiry_id, created_at);

-- ============================================================================
-- notifications
-- ============================================================================

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on notifications (user_id, read_at, created_at desc);

-- ============================================================================
-- reports
-- ============================================================================

create table reports (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  reporter_id uuid not null references profiles (id) on delete cascade,
  reason report_reason not null,
  details text,
  status report_status not null default 'open',
  reviewed_by uuid references profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index reports_vehicle_id_idx on reports (vehicle_id);
create index reports_status_idx on reports (status);

-- ============================================================================
-- audit_logs — written only via SECURITY DEFINER function, never direct insert
-- ============================================================================

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_logs_actor_id_idx on audit_logs (actor_id);
create index audit_logs_entity_idx on audit_logs (entity_type, entity_id);
create index audit_logs_created_at_idx on audit_logs (created_at desc);

create or replace function public.log_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
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

-- ============================================================================
-- site_settings — admin settings (service charge defaults, contact info,
-- homepage banner, featured listings, announcements, maintenance mode)
-- ============================================================================

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

alter table profiles enable row level security;
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

-- ---- profiles ----------------------------------------------------------

create policy "profiles_select_own_or_admin"
  on profiles for select
  using (id = auth.uid() or is_admin());

-- Contact-relevant public fields (name/avatar) are readable by anyone so a
-- vehicle detail page can show the lister's name; phone/role stay implicit
-- in the row but the app's DTO layer should only project safe columns for
-- non-owner/non-admin callers. Keeping this a single broad SELECT policy
-- (rather than column-level security) since Postgres RLS is row-, not
-- column-, scoped — enforce field-level redaction in the Data Access Layer.
create policy "profiles_select_public"
  on profiles for select
  using (true);

create policy "profiles_update_own"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_update_admin"
  on profiles for update
  using (is_admin());

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
  with check (
    lister_id = auth.uid()
    and current_user_role() in ('lister', 'admin')
  );

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

-- No direct INSERT policy for regular users/listers — notifications are
-- created by trusted server-side code (Server Actions/triggers) using the
-- service-role client, which bypasses RLS entirely. Admins can still send
-- system notifications through the same privileged path.

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

-- No INSERT/UPDATE/DELETE policies for any role — writes only happen via
-- the SECURITY DEFINER log_audit_event() function above.

-- ---- site_settings ---------------------------------------------------

create policy "site_settings_select_public"
  on site_settings for select
  using (true);

create policy "site_settings_write_admin"
  on site_settings for all
  using (is_admin())
  with check (is_admin());
