-- =====================================================================
-- Richfield Connect — Database Schema
-- Migration 10: Analytics & Moderation
-- =====================================================================
-- Raw view events + two summary views for "Profile analytics" and
-- "Business analytics". Also every admin-only action that needs an
-- audit trail: alumni/company verification, account deactivation,
-- opportunity approval, and report resolution. All centralized here
-- (rather than split across the tables they touch) because they share
-- the same audit-logging pattern via admin_actions.
-- =====================================================================

create table public.profile_views (
  id                 uuid primary key default gen_random_uuid(),
  viewer_id          uuid references public.profiles(id) on delete set null,
  viewed_profile_id  uuid not null references public.profiles(id) on delete cascade,
  viewed_at          timestamptz not null default now(),
  source             text
);

create index idx_profile_views_viewed on public.profile_views(viewed_profile_id, viewed_at desc);

create table public.opportunity_views (
  id              uuid primary key default gen_random_uuid(),
  viewer_id       uuid references public.profiles(id) on delete set null,
  opportunity_id  uuid not null references public.opportunities(id) on delete cascade,
  viewed_at       timestamptz not null default now()
);

create index idx_opportunity_views_opportunity on public.opportunity_views(opportunity_id, viewed_at desc);

create table public.reports (
  id                uuid primary key default gen_random_uuid(),
  reporter_id       uuid references public.profiles(id) on delete set null,
  target_type       public.report_target_type not null,
  target_id         uuid not null,
  reason            text not null,
  description       text,
  status            public.report_status not null default 'pending',
  reviewed_by       uuid references public.profiles(id) on delete set null,
  reviewed_at       timestamptz,
  resolution_notes  text,
  created_at        timestamptz not null default now()
);

create index idx_reports_status on public.reports(status);

create table public.admin_actions (
  id           uuid primary key default gen_random_uuid(),
  admin_id     uuid references public.profiles(id) on delete set null,
  action_type  text not null,
  target_type  text,
  target_id    uuid,
  details      jsonb,
  created_at   timestamptz not null default now()
);

create index idx_admin_actions_admin on public.admin_actions(admin_id, created_at desc);

-- =====================================================================
-- Analytics views
-- security_invoker means each view re-checks RLS against whoever is
-- actually querying it, rather than running with the view owner's
-- (effectively superuser) privileges — critical, or these would leak
-- data straight past every RLS policy above.
-- =====================================================================

create view public.profile_analytics_summary
with (security_invoker = true) as
select
  p.id as profile_id,
  count(distinct pv.id) as total_views,
  count(distinct pv.id) filter (where pv.viewed_at > now() - interval '30 days') as views_last_30_days,
  count(distinct c.id) filter (where c.status = 'accepted') as connection_count,
  count(distinct po.id) as post_count
from public.profiles p
left join public.profile_views pv on pv.viewed_profile_id = p.id
left join public.connections c on (c.requester_id = p.id or c.addressee_id = p.id)
left join public.posts po on po.author_id = p.id and po.is_deleted = false
group by p.id;

create view public.company_opportunity_analytics
with (security_invoker = true) as
select
  o.company_id,
  o.id as opportunity_id,
  o.title,
  o.status,
  count(distinct ov.id) as view_count,
  count(distinct a.id) as application_count,
  count(distinct a.id) filter (where a.status = 'shortlisted') as shortlisted_count,
  count(distinct a.id) filter (where a.status = 'offered') as offered_count
from public.opportunities o
left join public.opportunity_views ov on ov.opportunity_id = o.id
left join public.applications a on a.opportunity_id = o.id
group by o.company_id, o.id, o.title, o.status;

-- =====================================================================
-- Admin RPCs
-- Every one of these checks is_admin() itself (defense in depth on top
-- of RLS/grants) and writes to admin_actions, so "who approved what,
-- and when" is always answerable.
-- =====================================================================

create or replace function public.admin_review_alumni_verification(
  target_profile_id uuid, new_status public.verification_status, note text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can review alumni verification.';
  end if;

  update public.profiles set verification_status = new_status
  where id = target_profile_id and role = 'alumni';

  insert into public.admin_actions (admin_id, action_type, target_type, target_id, details)
  values (auth.uid(), 'alumni_verification_review', 'profile', target_profile_id,
          jsonb_build_object('status', new_status, 'note', note));

  perform public.create_notification(
    target_profile_id, 'system',
    case when new_status = 'verified' then 'Your alumni status has been verified'
         else 'Your alumni verification needs attention' end,
    note
  );
end;
$$;

create or replace function public.admin_review_company_verification(
  target_company_id uuid, new_status public.verification_status, note text default null
) returns void language plpgsql security definer set search_path = public as $$
declare notify_target uuid;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can review company verification.';
  end if;

  update public.companies
  set verification_status = new_status, verified_by = auth.uid(), verified_at = now()
  where id = target_company_id;

  insert into public.admin_actions (admin_id, action_type, target_type, target_id, details)
  values (auth.uid(), 'company_verification_review', 'company', target_company_id,
          jsonb_build_object('status', new_status, 'note', note));

  select created_by into notify_target from public.companies where id = target_company_id;
  if notify_target is not null then
    perform public.create_notification(
      notify_target, 'system',
      case when new_status = 'verified' then 'Your company has been verified'
           else 'Your company verification needs attention' end,
      note
    );
  end if;
end;
$$;

create or replace function public.admin_set_user_active(
  target_profile_id uuid, active boolean, note text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can change account status.';
  end if;

  update public.profiles set is_active = active where id = target_profile_id;

  insert into public.admin_actions (admin_id, action_type, target_type, target_id, details)
  values (auth.uid(), 'account_status_change', 'profile', target_profile_id,
          jsonb_build_object('active', active, 'note', note));
end;
$$;

create or replace function public.admin_review_opportunity(
  target_opportunity_id uuid, approve boolean, note text default null
) returns void language plpgsql security definer set search_path = public as $$
declare target_poster uuid; opp_title text;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can approve or reject opportunity postings.';
  end if;

  update public.opportunities
  set status = case when approve then 'approved' else 'rejected' end,
      approved_by = auth.uid(),
      approved_at = case when approve then now() else approved_at end,
      rejection_reason = case when approve then null else note end
  where id = target_opportunity_id and status = 'pending_approval';

  insert into public.admin_actions (admin_id, action_type, target_type, target_id, details)
  values (auth.uid(), 'opportunity_review', 'opportunity', target_opportunity_id,
          jsonb_build_object('approved', approve, 'note', note));

  select posted_by, title into target_poster, opp_title from public.opportunities where id = target_opportunity_id;
  if target_poster is not null then
    perform public.create_notification(
      target_poster, 'system',
      (case when approve then 'Approved: ' else 'Rejected: ' end) || coalesce(opp_title, 'your opportunity'),
      note, 'opportunity', target_opportunity_id
    );
  end if;
end;
$$;

create or replace function public.admin_resolve_report(
  target_report_id uuid, new_status public.report_status, notes text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can resolve reports.';
  end if;

  update public.reports
  set status = new_status, reviewed_by = auth.uid(), reviewed_at = now(), resolution_notes = notes
  where id = target_report_id;

  insert into public.admin_actions (admin_id, action_type, target_type, target_id, details)
  values (auth.uid(), 'report_resolution', 'report', target_report_id,
          jsonb_build_object('status', new_status, 'notes', notes));
end;
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table public.profile_views enable row level security;
alter table public.opportunity_views enable row level security;
alter table public.reports enable row level security;
alter table public.admin_actions enable row level security;

create policy "profile owners and admins see who viewed the profile"
  on public.profile_views for select to authenticated
  using (viewed_profile_id = auth.uid() or public.is_admin());
create policy "authenticated users log a profile view"
  on public.profile_views for insert to authenticated
  with check (viewer_id = auth.uid() or viewer_id is null);

create policy "hiring companies and admins see opportunity view stats"
  on public.opportunity_views for select to authenticated
  using (public.is_company_member((select company_id from public.opportunities where id = opportunity_id)) or public.is_admin());
create policy "authenticated users log an opportunity view"
  on public.opportunity_views for insert to authenticated
  with check (viewer_id = auth.uid() or viewer_id is null);

create policy "reporters and admins see a report"
  on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());
create policy "authenticated users file a report"
  on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "only admins update a report directly"
  on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- admin_resolve_report() above is the intended path; direct update is also
-- available to admins for flexibility (e.g. bulk triage tooling).

create policy "only admins view the audit log"
  on public.admin_actions for select to authenticated using (public.is_admin());
create policy "only admins write directly to the audit log"
  on public.admin_actions for insert to authenticated with check (public.is_admin());
-- most rows arrive via the RPCs above, which write here themselves.
