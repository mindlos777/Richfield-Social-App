-- =====================================================================
-- Richfield Connect — Database Schema
-- Migration 07: Opportunities & Applications
-- =====================================================================
-- Internships/learnerships/graduate programs, the applications against
-- them, and the smart-matching results. Status changes on both
-- opportunities and applications go through RPCs rather than raw
-- UPDATEs — see the workflow functions below.
-- =====================================================================

create table public.opportunities (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies(id) on delete cascade,
  posted_by             uuid references public.profiles(id) on delete set null,
  title                 text not null,
  description           text not null,
  opportunity_type      public.opportunity_type not null,
  work_mode             public.work_mode,
  location              text,
  min_year_of_study     smallint,
  qualifications_required text,
  application_deadline  date,
  start_date            date,
  duration_months       smallint,
  stipend_min           numeric(10, 2),
  stipend_max           numeric(10, 2),
  currency              text not null default 'ZAR', -- Richfield's programs are South Africa based; change per posting if needed
  status                public.opportunity_status not null default 'draft',
  approved_by           uuid references public.profiles(id) on delete set null,
  approved_at           timestamptz,
  rejection_reason      text,
  view_count            integer not null default 0,
  application_count     integer not null default 0,
  search_vector         tsvector generated always as (
                           setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                           setweight(to_tsvector('english', coalesce(description, '')), 'C')
                         ) stored,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_opportunities_company on public.opportunities(company_id);
create index idx_opportunities_status on public.opportunities(status);
create index idx_opportunities_search on public.opportunities using gin(search_vector);

create trigger set_opportunities_updated_at
  before update on public.opportunities
  for each row execute function public.set_updated_at();

create table public.opportunity_skills (
  opportunity_id  uuid not null references public.opportunities(id) on delete cascade,
  skill_id        uuid not null references public.skills(id) on delete cascade,
  is_required     boolean not null default true,
  primary key (opportunity_id, skill_id)
);

create table public.applications (
  id                uuid primary key default gen_random_uuid(),
  opportunity_id    uuid not null references public.opportunities(id) on delete cascade,
  applicant_id      uuid not null references public.profiles(id) on delete cascade,
  status            public.application_status not null default 'submitted',
  cover_letter      text,
  resume_url        text,
  applied_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  reviewed_by       uuid references public.profiles(id) on delete set null,
  reviewed_at       timestamptz,
  reviewer_notes    text,
  unique (opportunity_id, applicant_id)
);

create index idx_applications_opportunity on public.applications(opportunity_id, status);
create index idx_applications_applicant on public.applications(applicant_id);

create trigger set_applications_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

create or replace function public.bump_opportunity_application_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.opportunities set application_count = application_count + 1 where id = new.opportunity_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.opportunities set application_count = greatest(application_count - 1, 0) where id = old.opportunity_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger on_application_change
  after insert or delete on public.applications
  for each row execute function public.bump_opportunity_application_count();

create table public.opportunity_matches (
  id                uuid primary key default gen_random_uuid(),
  opportunity_id    uuid not null references public.opportunities(id) on delete cascade,
  profile_id        uuid not null references public.profiles(id) on delete cascade,
  match_score       numeric(5, 2) check (match_score between 0 and 100),
  matched_skill_ids uuid[] not null default '{}',
  is_dismissed      boolean not null default false,
  is_viewed         boolean not null default false,
  generated_at      timestamptz not null default now(),
  unique (opportunity_id, profile_id)
);

create index idx_opportunity_matches_profile on public.opportunity_matches(profile_id, is_dismissed);

create or replace function public.notify_opportunity_match()
returns trigger language plpgsql security definer set search_path = public as $$
declare opp_title text;
begin
  select title into opp_title from public.opportunities where id = new.opportunity_id;
  perform public.create_notification(
    new.profile_id, 'opportunity_match',
    'New match: ' || coalesce(opp_title, 'an opportunity'),
    'Match score: ' || new.match_score || '%', 'opportunity', new.opportunity_id
  );
  return new;
end;
$$;

create trigger on_opportunity_match_notify
  after insert on public.opportunity_matches
  for each row execute function public.notify_opportunity_match();

-- =====================================================================
-- Workflow RPCs
-- Opportunity/application status is not directly client-writable (see
-- the column-privilege revokes below) — every transition goes through
-- one of these so the state machine can't be short-circuited.
-- =====================================================================

create or replace function public.submit_opportunity_for_approval(target_opportunity_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_company_member((select company_id from public.opportunities where id = target_opportunity_id)) then
    raise exception 'Only members of the posting company can submit this opportunity.';
  end if;
  update public.opportunities
  set status = 'pending_approval'
  where id = target_opportunity_id and status = 'draft';
end;
$$;

create or replace function public.close_opportunity(target_opportunity_id uuid, mark_filled boolean default false)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_company_member((select company_id from public.opportunities where id = target_opportunity_id)) then
    raise exception 'Only members of the posting company can close this opportunity.';
  end if;
  update public.opportunities
  set status = case when mark_filled then 'filled' else 'closed' end
  where id = target_opportunity_id and status = 'approved';
end;
$$;

create or replace function public.update_application_status(
  target_application_id uuid, new_status public.application_status, note text default null
) returns void language plpgsql security definer set search_path = public as $$
declare target_opportunity uuid; target_applicant uuid; opp_title text;
begin
  select opportunity_id, applicant_id into target_opportunity, target_applicant
  from public.applications where id = target_application_id;

  if not public.is_company_member((select company_id from public.opportunities where id = target_opportunity)) then
    raise exception 'Only members of the posting company can update this application.';
  end if;

  update public.applications
  set status = new_status, reviewer_notes = coalesce(note, reviewer_notes),
      reviewed_by = auth.uid(), reviewed_at = now()
  where id = target_application_id;

  select title into opp_title from public.opportunities where id = target_opportunity;
  perform public.create_notification(
    target_applicant, 'application_update',
    'Your application for ' || coalesce(opp_title, 'an opportunity') || ' was updated',
    'New status: ' || new_status, 'application', target_application_id
  );
end;
$$;

create or replace function public.withdraw_application(target_application_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.applications
  set status = 'withdrawn'
  where id = target_application_id and applicant_id = auth.uid();
end;
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table public.opportunities enable row level security;
alter table public.opportunity_skills enable row level security;
alter table public.applications enable row level security;
alter table public.opportunity_matches enable row level security;

create policy "approved opportunities are public, others visible to insiders"
  on public.opportunities for select to authenticated
  using (status = 'approved' or public.is_company_member(company_id) or public.is_admin());
create policy "company members create opportunities for their company"
  on public.opportunities for insert to authenticated
  with check (public.is_company_member(company_id) and posted_by = auth.uid());
create policy "company members edit their own opportunity listings"
  on public.opportunities for update to authenticated
  using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "company owners or admins delete an opportunity"
  on public.opportunities for delete to authenticated
  using (public.is_company_owner(company_id) or public.is_admin());

revoke update on public.opportunities from authenticated;
grant update (
  title, description, opportunity_type, work_mode, location, min_year_of_study,
  qualifications_required, application_deadline, start_date, duration_months,
  stipend_min, stipend_max, currency
) on public.opportunities to authenticated;
-- status, approved_by, approved_at, rejection_reason: only via the RPCs above / migration 10.

create policy "opportunity skills are viewable by authenticated users"
  on public.opportunity_skills for select to authenticated using (true);
create policy "company members tag their opportunity's required skills"
  on public.opportunity_skills for all to authenticated
  using (public.is_company_member((select company_id from public.opportunities where id = opportunity_id)))
  with check (public.is_company_member((select company_id from public.opportunities where id = opportunity_id)));

create policy "applicants and hiring companies see relevant applications"
  on public.applications for select to authenticated
  using (
    applicant_id = auth.uid()
    or public.is_company_member((select company_id from public.opportunities where id = opportunity_id))
    or public.is_admin()
  );
create policy "students and alumni apply to opportunities"
  on public.applications for insert to authenticated
  with check (applicant_id = auth.uid() and public.current_user_role() in ('student', 'alumni'));

revoke update on public.applications from authenticated;
-- zero direct column grants: every status change goes through
-- update_application_status() or withdraw_application() above.

create policy "profile owners and hiring companies see match results"
  on public.opportunity_matches for select to authenticated
  using (
    profile_id = auth.uid()
    or public.is_company_member((select company_id from public.opportunities where id = opportunity_id))
    or public.is_admin()
  );
-- no insert policy: matches are generated server-side (service role / edge function), not client-submitted.

revoke update on public.opportunity_matches from authenticated;
grant update (is_dismissed, is_viewed) on public.opportunity_matches to authenticated;
