-- =====================================================================
-- Richfield Connect — Database Schema
-- Migration 08: Career Pathways, Events & Announcements
-- =====================================================================

create table public.career_pathways (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  industry_id  uuid references public.industries(id),
  icon_url     text,
  created_by   uuid references public.profiles(id) on delete set null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger set_career_pathways_updated_at
  before update on public.career_pathways
  for each row execute function public.set_updated_at();

create table public.career_pathway_steps (
  id                     uuid primary key default gen_random_uuid(),
  pathway_id             uuid not null references public.career_pathways(id) on delete cascade,
  step_order             smallint not null,
  title                  text not null,
  description            text,
  recommended_skill_ids  uuid[] not null default '{}',
  resources              jsonb not null default '[]',
  created_at             timestamptz not null default now(),
  unique (pathway_id, step_order)
);

create table public.profile_pathway_progress (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references public.profiles(id) on delete cascade,
  pathway_id          uuid not null references public.career_pathways(id) on delete cascade,
  current_step_order  smallint not null default 1,
  started_at          timestamptz not null default now(),
  completed_at        timestamptz,
  unique (profile_id, pathway_id)
);

create table public.events (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  event_type    public.event_type not null default 'other',
  location      text,
  is_virtual    boolean not null default false,
  virtual_link  text,
  start_time    timestamptz not null,
  end_time      timestamptz,
  banner_url    text,
  capacity      integer,
  rsvp_count    integer not null default 0,
  status        public.event_status not null default 'draft',
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_events_start_time on public.events(start_time) where status = 'published';

create trigger set_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create table public.event_rsvps (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  status      public.rsvp_status not null default 'interested',
  rsvp_at     timestamptz not null default now(),
  unique (event_id, profile_id)
);

create or replace function public.bump_event_rsvp_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.status = 'going' then
    update public.events set rsvp_count = rsvp_count + 1 where id = new.event_id;
  elsif tg_op = 'DELETE' and old.status = 'going' then
    update public.events set rsvp_count = greatest(rsvp_count - 1, 0) where id = old.event_id;
  elsif tg_op = 'UPDATE' and old.status <> new.status then
    if new.status = 'going' then
      update public.events set rsvp_count = rsvp_count + 1 where id = new.event_id;
    elsif old.status = 'going' then
      update public.events set rsvp_count = greatest(rsvp_count - 1, 0) where id = new.event_id;
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger on_event_rsvp_change
  after insert or update or delete on public.event_rsvps
  for each row execute function public.bump_event_rsvp_count();

create table public.announcements (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  content          text not null,
  target_audience  public.announcement_audience not null default 'all',
  is_pinned        boolean not null default false,
  created_by       uuid references public.profiles(id) on delete set null,
  published_at     timestamptz,
  expires_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger set_announcements_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

-- Fan-out notification on publish. Fine at hackathon/campus scale; if
-- the user base grows large, swap this for a queued/batched job instead
-- of a synchronous per-row INSERT ... SELECT.
create or replace function public.notify_announcement_published()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.published_at is not null and new.published_at <= now() then
    insert into public.notifications (profile_id, type, title, body, related_entity_type, related_entity_id)
    select p.id, 'announcement', new.title, new.content, 'announcement', new.id
    from public.profiles p
    where new.target_audience = 'all' or p.role::text = new.target_audience::text;
  end if;
  return new;
end;
$$;

create trigger on_announcement_published
  after insert on public.announcements
  for each row execute function public.notify_announcement_published();

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table public.career_pathways enable row level security;
alter table public.career_pathway_steps enable row level security;
alter table public.profile_pathway_progress enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.announcements enable row level security;

create policy "active pathways are viewable by authenticated users"
  on public.career_pathways for select to authenticated using (is_active = true or public.is_admin());
create policy "only admins manage career pathways"
  on public.career_pathways for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "pathway steps are viewable by authenticated users"
  on public.career_pathway_steps for select to authenticated using (true);
create policy "only admins manage pathway steps"
  on public.career_pathway_steps for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "users manage their own pathway progress"
  on public.profile_pathway_progress for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "published events are public, drafts visible to their admin author"
  on public.events for select to authenticated
  using (status = 'published' or created_by = auth.uid() or public.is_admin());
create policy "only admins manage events"
  on public.events for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "users see their own rsvps, event admins see all rsvps for their event"
  on public.event_rsvps for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
create policy "users manage their own rsvp"
  on public.event_rsvps for insert to authenticated with check (profile_id = auth.uid());
create policy "users update their own rsvp"
  on public.event_rsvps for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "users cancel their own rsvp"
  on public.event_rsvps for delete to authenticated using (profile_id = auth.uid());

create policy "published, unexpired announcements reach their audience"
  on public.announcements for select to authenticated
  using (
    published_at is not null and published_at <= now()
    and (expires_at is null or expires_at > now())
    and (target_audience = 'all' or target_audience::text = public.current_user_role()::text or public.is_admin())
  );
create policy "only admins manage announcements"
  on public.announcements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
