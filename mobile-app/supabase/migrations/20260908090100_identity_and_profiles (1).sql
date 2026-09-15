-- =====================================================================
-- Richfield Connect — Database Schema
-- Migration 02: Identity & Profiles
-- =====================================================================
-- The hub of the whole schema. profiles is 1:1 with auth.users and
-- almost every other table references it. Also defines the security
-- helper functions (is_admin, is_company_member, current_user_role)
-- that later RLS policies rely on to avoid recursive-policy problems.
-- =====================================================================

-- ---- industries (lookup) ------------------------------------------------
create table public.industries (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

-- ---- profiles -------------------------------------------------------------
-- id deliberately mirrors auth.users.id rather than having its own default,
-- so every profile IS an auth user, 1:1, and cascades cleanly on account deletion.
create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  role                  public.user_role not null default 'student',
  email                 text not null,
  full_name             text not null,
  headline              text,
  bio                   text,
  avatar_url            text,
  banner_url            text,
  location              text,
  phone                 text,
  website_url           text,
  linkedin_url          text,
  verification_status   public.verification_status not null default 'verified',
  is_active             boolean not null default true,
  last_active_at        timestamptz,
  search_vector         tsvector generated always as (
                           setweight(to_tsvector('english', coalesce(full_name, '')), 'A') ||
                           setweight(to_tsvector('english', coalesce(headline, '')), 'B') ||
                           setweight(to_tsvector('english', coalesce(bio, '')), 'C')
                         ) stored,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on column public.profiles.verification_status is
  'Meaningful mainly for alumni (admin verifies real graduates). Students/admins default verified; business identity is verified at the company level instead.';

create index idx_profiles_role on public.profiles(role);
create index idx_profiles_search on public.profiles using gin(search_vector);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---- student_profiles (role extension) -------------------------------
create table public.student_profiles (
  profile_id              uuid primary key references public.profiles(id) on delete cascade,
  student_number          text,
  program                 text,
  faculty                 text,
  year_of_study           smallint check (year_of_study between 1 and 8),
  expected_graduation_date date,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger set_student_profiles_updated_at
  before update on public.student_profiles
  for each row execute function public.set_updated_at();

-- ---- alumni_profiles (role extension) ---------------------------------
create table public.alumni_profiles (
  profile_id        uuid primary key references public.profiles(id) on delete cascade,
  graduation_year    smallint,
  program            text,
  faculty            text,
  current_position   text,
  current_company    text,
  industry_id        uuid references public.industries(id),
  is_mentor          boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_alumni_profiles_mentor on public.alumni_profiles(is_mentor) where is_mentor = true;

create trigger set_alumni_profiles_updated_at
  before update on public.alumni_profiles
  for each row execute function public.set_updated_at();

-- ---- companies -------------------------------------------------------
create table public.companies (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text unique,
  description         text,
  industry_id         uuid references public.industries(id),
  company_size        text check (company_size in ('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')),
  founded_year        smallint,
  website_url         text,
  logo_url            text,
  banner_url          text,
  location            text,
  verification_status public.verification_status not null default 'pending',
  verified_by         uuid references public.profiles(id) on delete set null,
  verified_at         timestamptz,
  created_by          uuid references public.profiles(id) on delete set null,
  search_vector       tsvector generated always as (
                         setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
                         setweight(to_tsvector('english', coalesce(description, '')), 'C')
                       ) stored,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_companies_verification on public.companies(verification_status);
create index idx_companies_search on public.companies using gin(search_vector);

create trigger set_companies_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- ---- company_members (who can act on behalf of a company) -----------
create table public.company_members (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  role        public.company_member_role not null default 'recruiter',
  created_at  timestamptz not null default now(),
  unique (company_id, profile_id)
);

create index idx_company_members_profile on public.company_members(profile_id);

-- =====================================================================
-- Security helper functions
-- security definer + fixed search_path so they can safely read tables
-- that themselves have RLS enabled, without recursive-policy issues.
-- =====================================================================

create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.company_members
    where company_id = target_company_id and profile_id = auth.uid()
  );
$$;

create or replace function public.is_company_owner(target_company_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.company_members
    where company_id = target_company_id and profile_id = auth.uid() and role = 'owner'
  );
$$;

-- =====================================================================
-- Bootstrap triggers
-- =====================================================================

-- Auto-provisions a profile (and the matching role-extension row) the
-- moment someone signs up via Supabase Auth. Deliberately does NOT trust
-- the client to grant itself the admin role: any 'admin' value in
-- signup metadata is silently downgraded to 'student'. Admin has to be
-- promoted by an existing admin (see admin_set_user_active-style RPCs
-- in migration 10) — never claimed at signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role       public.user_role;
  safe_role            public.user_role;
  initial_verification public.verification_status;
begin
  begin
    requested_role := (new.raw_user_meta_data->>'role')::public.user_role;
  exception when others then
    requested_role := 'student';
  end;

  if requested_role = 'admin' or requested_role is null then
    safe_role := 'student';
  else
    safe_role := requested_role;
  end if;

  initial_verification := case when safe_role = 'alumni' then 'pending' else 'verified' end;

  insert into public.profiles (id, role, email, full_name, verification_status)
  values (
    new.id,
    safe_role,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    initial_verification
  );

  if safe_role = 'student' then
    insert into public.student_profiles (profile_id) values (new.id);
  elsif safe_role = 'alumni' then
    insert into public.alumni_profiles (profile_id) values (new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keeps profiles.email in sync if someone changes their login email.
create or replace function public.handle_user_email_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_user_email_update();

-- First member of a new company is always its creator, as owner.
-- This also sidesteps a chicken-and-egg problem in the company_members
-- RLS policy below (you need to already be a member to add a member).
create or replace function public.handle_new_company()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.company_members (company_id, profile_id, role)
    values (new.id, new.created_by, 'owner');
  end if;
  return new;
end;
$$;

create trigger on_company_created
  after insert on public.companies
  for each row execute function public.handle_new_company();

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table public.industries enable row level security;
alter table public.profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.alumni_profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;

-- industries: public read, admin-managed
create policy "industries are viewable by authenticated users"
  on public.industries for select to authenticated using (true);
create policy "only admins manage industries"
  on public.industries for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- profiles: public professional directory, self-managed (see column grants below)
create policy "profiles are viewable by authenticated users"
  on public.profiles for select to authenticated
  using (is_active = true or id = auth.uid() or public.is_admin());
create policy "users can update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
-- no insert/delete policy for regular users: rows are only created by
-- handle_new_user() (security definer, bypasses RLS) and removed via
-- auth.users cascade.

-- student_profiles / alumni_profiles: part of the public profile, self-managed
create policy "student profiles are viewable by authenticated users"
  on public.student_profiles for select to authenticated using (true);
create policy "students manage their own student profile"
  on public.student_profiles for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "alumni profiles are viewable by authenticated users"
  on public.alumni_profiles for select to authenticated using (true);
create policy "alumni manage their own alumni profile"
  on public.alumni_profiles for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- companies: verified companies are public; members/creator/admin see their own regardless of status
create policy "companies are viewable when verified or by insiders"
  on public.companies for select to authenticated
  using (verification_status = 'verified' or created_by = auth.uid() or public.is_company_member(id) or public.is_admin());
create policy "business users can register a company"
  on public.companies for insert to authenticated
  with check (created_by = auth.uid() and public.current_user_role() = 'business');
create policy "company members can update their company"
  on public.companies for update to authenticated
  using (public.is_company_member(id)) with check (public.is_company_member(id));
create policy "company owners or admins can delete a company"
  on public.companies for delete to authenticated
  using (public.is_company_owner(id) or public.is_admin());

-- company_members: visible to fellow members/admin; only owners add/remove others
create policy "company members are viewable by fellow members"
  on public.company_members for select to authenticated
  using (public.is_company_member(company_id) or public.is_admin());
create policy "company owners add members"
  on public.company_members for insert to authenticated
  with check (public.is_company_owner(company_id));
create policy "company owners update member roles"
  on public.company_members for update to authenticated
  using (public.is_company_owner(company_id)) with check (public.is_company_owner(company_id));
create policy "owners remove members or members remove themselves"
  on public.company_members for delete to authenticated
  using (profile_id = auth.uid() or public.is_company_owner(company_id));

-- =====================================================================
-- Column-level privilege locks
-- RLS gets you row-level control; these add column-level control on top
-- for the handful of fields that must never be client-settable directly.
-- Everything below is only ever changed via SECURITY DEFINER RPCs
-- (see migration 10) so every change is deliberate and auditable.
-- =====================================================================

revoke update on public.profiles from authenticated;
grant update (
  full_name, headline, bio, avatar_url, banner_url, location, phone,
  website_url, linkedin_url, last_active_at
) on public.profiles to authenticated;
-- role, verification_status, is_active, email: admin/system only.

revoke update on public.companies from authenticated;
grant update (
  name, slug, description, industry_id, company_size, founded_year,
  website_url, logo_url, banner_url, location
) on public.companies to authenticated;
-- verification_status, verified_by, verified_at, created_by: admin only.
