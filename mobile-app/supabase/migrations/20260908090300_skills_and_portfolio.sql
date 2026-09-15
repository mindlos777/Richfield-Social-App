-- =====================================================================
-- Richfield Connect — Database Schema
-- Migration 04: Skills & Portfolio
-- =====================================================================
-- Everything a student/alumni profile shows off: skills, endorsements,
-- work experience, showcase projects, certifications.
-- =====================================================================

create table public.skills (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  category    text check (category in ('technical', 'soft', 'language', 'tool', 'other')) default 'other',
  created_at  timestamptz not null default now()
);

create index idx_skills_name_trgm on public.skills using gin (name gin_trgm_ops);

create table public.profile_skills (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references public.profiles(id) on delete cascade,
  skill_id            uuid not null references public.skills(id) on delete cascade,
  proficiency_level   text check (proficiency_level in ('beginner', 'intermediate', 'advanced', 'expert')) default 'intermediate',
  created_at          timestamptz not null default now(),
  unique (profile_id, skill_id)
);

create index idx_profile_skills_skill on public.profile_skills(skill_id);

create table public.skill_endorsements (
  id                uuid primary key default gen_random_uuid(),
  profile_skill_id  uuid not null references public.profile_skills(id) on delete cascade,
  endorsed_by       uuid not null references public.profiles(id) on delete cascade,
  created_at        timestamptz not null default now(),
  unique (profile_skill_id, endorsed_by)
);

create table public.experience (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  job_title       text not null,
  company_name    text not null,
  employment_type text,
  location        text,
  description     text,
  start_date      date,
  end_date        date,
  is_current      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_experience_profile on public.experience(profile_id);

create trigger set_experience_updated_at
  before update on public.experience
  for each row execute function public.set_updated_at();

create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  description   text,
  project_url   text,
  repo_url      text,
  image_urls    text[] not null default '{}',
  start_date    date,
  end_date      date,
  is_current    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_projects_profile on public.projects(profile_id);

create trigger set_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create table public.project_skills (
  project_id  uuid not null references public.projects(id) on delete cascade,
  skill_id    uuid not null references public.skills(id) on delete cascade,
  primary key (project_id, skill_id)
);

create table public.certifications (
  id                    uuid primary key default gen_random_uuid(),
  profile_id            uuid not null references public.profiles(id) on delete cascade,
  title                 text not null,
  issuing_organization  text,
  issue_date            date,
  expiry_date           date,
  credential_id         text,
  credential_url        text,
  created_at            timestamptz not null default now()
);

create index idx_certifications_profile on public.certifications(profile_id);

-- =====================================================================
-- Row Level Security
-- All of this is part of a profile's public portfolio: viewable by any
-- authenticated user, editable only by the profile owner (endorsements
-- are the one exception — anyone but the owner can endorse).
-- =====================================================================

alter table public.skills enable row level security;
alter table public.profile_skills enable row level security;
alter table public.skill_endorsements enable row level security;
alter table public.experience enable row level security;
alter table public.projects enable row level security;
alter table public.project_skills enable row level security;
alter table public.certifications enable row level security;

create policy "skills are viewable by authenticated users"
  on public.skills for select to authenticated using (true);
create policy "authenticated users can add new skills to the taxonomy"
  on public.skills for insert to authenticated with check (true);
create policy "only admins edit or remove skills"
  on public.skills for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "only admins delete skills"
  on public.skills for delete to authenticated using (public.is_admin());

create policy "profile skills are viewable by authenticated users"
  on public.profile_skills for select to authenticated using (true);
create policy "profile owners manage their own skills"
  on public.profile_skills for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "skill endorsements are viewable by authenticated users"
  on public.skill_endorsements for select to authenticated using (true);
create policy "anyone but the owner can endorse a skill"
  on public.skill_endorsements for insert to authenticated
  with check (
    endorsed_by = auth.uid()
    and endorsed_by <> (select profile_id from public.profile_skills where id = profile_skill_id)
  );
create policy "endorsers can remove their own endorsement"
  on public.skill_endorsements for delete to authenticated using (endorsed_by = auth.uid());

create policy "experience is viewable by authenticated users"
  on public.experience for select to authenticated using (true);
create policy "profile owners manage their own experience"
  on public.experience for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "projects are viewable by authenticated users"
  on public.projects for select to authenticated using (true);
create policy "profile owners manage their own projects"
  on public.projects for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "project skills are viewable by authenticated users"
  on public.project_skills for select to authenticated using (true);
create policy "project owners manage their project's skill tags"
  on public.project_skills for all to authenticated
  using (exists (select 1 from public.projects where id = project_id and profile_id = auth.uid()))
  with check (exists (select 1 from public.projects where id = project_id and profile_id = auth.uid()));

create policy "certifications are viewable by authenticated users"
  on public.certifications for select to authenticated using (true);
create policy "profile owners manage their own certifications"
  on public.certifications for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
