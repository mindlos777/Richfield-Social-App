-- =====================================================================
-- Richfield Connect — Database Schema
-- Migration 03: Notifications Core
-- =====================================================================
-- Placed early (not with the rest of the notification-triggering
-- features) on purpose: connections, posts, messaging, opportunities
-- and events all fire notifications via triggers, so this table and
-- its create_notification() helper need to exist before those
-- migrations run.
-- =====================================================================

create table public.notifications (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references public.profiles(id) on delete cascade,
  type                public.notification_type not null,
  title               text not null,
  body                text,
  related_entity_type text,
  related_entity_id   uuid,
  is_read             boolean not null default false,
  read_at             timestamptz,
  created_at          timestamptz not null default now()
);

create index idx_notifications_profile_unread on public.notifications(profile_id, is_read, created_at desc);

create table public.push_tokens (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles(id) on delete cascade,
  expo_push_token   text not null,
  device_type       text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (profile_id, expo_push_token)
);

create trigger set_push_tokens_updated_at
  before update on public.push_tokens
  for each row execute function public.set_updated_at();

-- Central helper every notification-producing trigger/RPC calls into.
-- security definer so it can insert regardless of who triggered it.
create or replace function public.create_notification(
  p_profile_id          uuid,
  p_type                public.notification_type,
  p_title               text,
  p_body                text default null,
  p_related_entity_type text default null,
  p_related_entity_id   uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.notifications (profile_id, type, title, body, related_entity_type, related_entity_id)
  values (p_profile_id, p_type, p_title, p_body, p_related_entity_type, p_related_entity_id)
  returning id into new_id;
  return new_id;
end;
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;

create policy "users see their own notifications"
  on public.notifications for select to authenticated
  using (profile_id = auth.uid());
create policy "users can clear their own notifications"
  on public.notifications for delete to authenticated
  using (profile_id = auth.uid());
-- no insert policy: rows only ever come from create_notification() (security definer).

revoke update on public.notifications from authenticated;
grant update (is_read, read_at) on public.notifications to authenticated;

create policy "users manage their own push tokens"
  on public.push_tokens for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
