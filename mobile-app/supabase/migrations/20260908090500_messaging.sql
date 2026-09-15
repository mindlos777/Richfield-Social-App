-- =====================================================================
-- Richfield Connect — Database Schema
-- Migration 06: Messaging
-- =====================================================================
-- Direct + group conversations. Access is entirely gated by
-- conversation participation, checked through a security-definer
-- helper to avoid the classic "policy queries the table it's a
-- policy on" recursion problem.
-- =====================================================================

create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  is_group        boolean not null default false,
  title           text,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create trigger set_conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create table public.conversation_participants (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.conversations(id) on delete cascade,
  profile_id        uuid not null references public.profiles(id) on delete cascade,
  joined_at         timestamptz not null default now(),
  last_read_at      timestamptz,
  is_admin          boolean not null default false,
  unique (conversation_id, profile_id)
);

create index idx_conversation_participants_profile on public.conversation_participants(profile_id);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  content         text,
  media_url       text,
  media_type      public.media_type,
  is_deleted      boolean not null default false,
  edited_at       timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_messages_conversation_created on public.messages(conversation_id, created_at);

create or replace function public.is_conversation_participant(target_conversation_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = target_conversation_id and profile_id = auth.uid()
  );
$$;

-- Creator is auto-added as the first (admin) participant — same
-- bootstrap pattern as handle_new_company, and for the same reason.
create or replace function public.handle_new_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into public.conversation_participants (conversation_id, profile_id, is_admin)
    values (new.id, new.created_by, true);
  end if;
  return new;
end;
$$;

create trigger on_conversation_created
  after insert on public.conversations
  for each row execute function public.handle_new_conversation();

create or replace function public.bump_conversation_last_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

create trigger on_message_sent
  after insert on public.messages
  for each row execute function public.bump_conversation_last_message();

create or replace function public.notify_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare sender_name text; recipient record;
begin
  select full_name into sender_name from public.profiles where id = new.sender_id;
  for recipient in
    select profile_id from public.conversation_participants
    where conversation_id = new.conversation_id and profile_id <> new.sender_id
  loop
    perform public.create_notification(
      recipient.profile_id, 'new_message',
      sender_name, new.content, 'conversation', new.conversation_id
    );
  end loop;
  return new;
end;
$$;

create trigger on_message_notify
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

create policy "participants view their conversations"
  on public.conversations for select to authenticated
  using (public.is_conversation_participant(id));
create policy "any authenticated user can start a conversation"
  on public.conversations for insert to authenticated with check (created_by = auth.uid());
create policy "participants update conversation metadata"
  on public.conversations for update to authenticated
  using (public.is_conversation_participant(id)) with check (public.is_conversation_participant(id));

create policy "participants view the participant list"
  on public.conversation_participants for select to authenticated
  using (public.is_conversation_participant(conversation_id));
create policy "existing participants add others"
  on public.conversation_participants for insert to authenticated
  with check (public.is_conversation_participant(conversation_id));
create policy "participants update their own membership row"
  on public.conversation_participants for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "participants can leave a conversation"
  on public.conversation_participants for delete to authenticated
  using (profile_id = auth.uid());

create policy "participants view messages in their conversations"
  on public.messages for select to authenticated
  using (public.is_conversation_participant(conversation_id));
create policy "participants send messages"
  on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_conversation_participant(conversation_id));
create policy "senders edit or soft-delete their own messages"
  on public.messages for update to authenticated
  using (sender_id = auth.uid()) with check (sender_id = auth.uid());
