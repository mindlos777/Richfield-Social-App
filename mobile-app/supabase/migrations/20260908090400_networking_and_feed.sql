-- =====================================================================
-- Richfield Connect — Database Schema
-- Migration 05: Networking & Feed
-- =====================================================================
-- Professional connections plus the social feed: posts (text/image/
-- video/article), comments (threaded), and reactions. Denormalized
-- counters and notification triggers live right next to the tables
-- that cause them.
-- =====================================================================

-- ---- connections -------------------------------------------------------
create table public.connections (
  id             uuid primary key default gen_random_uuid(),
  requester_id   uuid not null references public.profiles(id) on delete cascade,
  addressee_id   uuid not null references public.profiles(id) on delete cascade,
  status         public.connection_status not null default 'pending',
  message        text,
  created_at     timestamptz not null default now(),
  responded_at   timestamptz,
  check (requester_id <> addressee_id)
);

-- one connection row per unordered pair, regardless of who requested
create unique index uq_connections_pair
  on public.connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index idx_connections_addressee on public.connections(addressee_id, status);
create index idx_connections_requester on public.connections(requester_id, status);

create or replace function public.are_connected(profile_a uuid, profile_b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.connections
    where status = 'accepted'
      and ((requester_id = profile_a and addressee_id = profile_b)
        or (requester_id = profile_b and addressee_id = profile_a))
  );
$$;

-- Blocking can happen from any state (or none), by either party, so it's
-- easier as an RPC than to shoehorn into the declarative accept/decline policy.
create or replace function public.block_connection(other_profile_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.connections
  set status = 'blocked', responded_at = now()
  where (requester_id = auth.uid() and addressee_id = other_profile_id)
     or (requester_id = other_profile_id and addressee_id = auth.uid());

  if not found then
    insert into public.connections (requester_id, addressee_id, status, responded_at)
    values (auth.uid(), other_profile_id, 'blocked', now());
  end if;
end;
$$;

-- ---- posts ---------------------------------------------------------------
create table public.posts (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references public.profiles(id) on delete cascade,
  content        text,
  post_type      public.post_type not null default 'text',
  visibility     public.post_visibility not null default 'public',
  like_count     integer not null default 0,
  comment_count  integer not null default 0,
  is_deleted     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_posts_author_created on public.posts(author_id, created_at desc);
create index idx_posts_feed on public.posts(created_at desc) where is_deleted = false;

create trigger set_posts_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

create table public.post_media (
  id              uuid primary key default gen_random_uuid(),
  post_id         uuid not null references public.posts(id) on delete cascade,
  media_url       text not null,
  media_type      public.media_type not null,
  thumbnail_url   text,
  duration_seconds integer,
  position        smallint not null default 0
);

create index idx_post_media_post on public.post_media(post_id);

create table public.post_comments (
  id                 uuid primary key default gen_random_uuid(),
  post_id            uuid not null references public.posts(id) on delete cascade,
  author_id          uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id  uuid references public.post_comments(id) on delete cascade,
  content            text not null,
  is_deleted         boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_post_comments_post on public.post_comments(post_id, created_at);
create index idx_post_comments_parent on public.post_comments(parent_comment_id);

create trigger set_post_comments_updated_at
  before update on public.post_comments
  for each row execute function public.set_updated_at();

create table public.post_reactions (
  id             uuid primary key default gen_random_uuid(),
  post_id        uuid not null references public.posts(id) on delete cascade,
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  reaction_type  public.reaction_type not null default 'like',
  created_at     timestamptz not null default now(),
  unique (post_id, profile_id)
);

create table public.comment_reactions (
  id             uuid primary key default gen_random_uuid(),
  comment_id     uuid not null references public.post_comments(id) on delete cascade,
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  reaction_type  public.reaction_type not null default 'like',
  created_at     timestamptz not null default now(),
  unique (comment_id, profile_id)
);

-- =====================================================================
-- Denormalized counters
-- Avoids COUNT(*) on every feed render.
-- =====================================================================

create or replace function public.bump_post_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger on_post_reaction_change
  after insert or delete on public.post_reactions
  for each row execute function public.bump_post_like_count();

create or replace function public.bump_post_comment_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger on_post_comment_change
  after insert or delete on public.post_comments
  for each row execute function public.bump_post_comment_count();

-- =====================================================================
-- Notification triggers
-- =====================================================================

create or replace function public.notify_new_connection_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare requester_name text;
begin
  select full_name into requester_name from public.profiles where id = new.requester_id;
  perform public.create_notification(
    new.addressee_id, 'connection_request',
    requester_name || ' wants to connect', new.message, 'connection', new.id
  );
  return new;
end;
$$;

create trigger on_connection_requested
  after insert on public.connections
  for each row when (new.status = 'pending') execute function public.notify_new_connection_request();

create or replace function public.notify_connection_accepted()
returns trigger language plpgsql security definer set search_path = public as $$
declare addressee_name text;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    select full_name into addressee_name from public.profiles where id = new.addressee_id;
    perform public.create_notification(
      new.requester_id, 'connection_accepted',
      addressee_name || ' accepted your connection request', null, 'connection', new.id
    );
  end if;
  return new;
end;
$$;

create trigger on_connection_accepted
  after update on public.connections
  for each row execute function public.notify_connection_accepted();

create or replace function public.notify_post_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare post_author uuid; reactor_name text;
begin
  select author_id into post_author from public.posts where id = new.post_id;
  if post_author is not null and post_author <> new.profile_id then
    select full_name into reactor_name from public.profiles where id = new.profile_id;
    perform public.create_notification(
      post_author, 'post_reaction',
      reactor_name || ' reacted to your post', null, 'post', new.post_id
    );
  end if;
  return new;
end;
$$;

create trigger on_post_reaction_notify
  after insert on public.post_reactions
  for each row execute function public.notify_post_reaction();

create or replace function public.notify_post_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare post_author uuid; commenter_name text; parent_author uuid;
begin
  select full_name into commenter_name from public.profiles where id = new.author_id;

  select author_id into post_author from public.posts where id = new.post_id;
  if post_author is not null and post_author <> new.author_id then
    perform public.create_notification(
      post_author, 'post_comment',
      commenter_name || ' commented on your post', new.content, 'post', new.post_id
    );
  end if;

  if new.parent_comment_id is not null then
    select author_id into parent_author from public.post_comments where id = new.parent_comment_id;
    if parent_author is not null and parent_author not in (new.author_id, post_author) then
      perform public.create_notification(
        parent_author, 'post_comment',
        commenter_name || ' replied to your comment', new.content, 'post', new.post_id
      );
    end if;
  end if;

  return new;
end;
$$;

create trigger on_post_comment_notify
  after insert on public.post_comments
  for each row execute function public.notify_post_comment();

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table public.connections enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_reactions enable row level security;
alter table public.comment_reactions enable row level security;

create policy "participants view their own connections"
  on public.connections for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid() or public.is_admin());
create policy "users send connection requests"
  on public.connections for insert to authenticated
  with check (requester_id = auth.uid());
create policy "addressee responds to a pending request"
  on public.connections for update to authenticated
  using (addressee_id = auth.uid() and status = 'pending')
  with check (addressee_id = auth.uid() and status in ('accepted', 'declined'));
create policy "requester cancels their own pending request"
  on public.connections for delete to authenticated
  using (requester_id = auth.uid() and status = 'pending');

revoke update on public.connections from authenticated;
grant update (status, responded_at) on public.connections to authenticated;

create policy "posts respect visibility"
  on public.posts for select to authenticated
  using (
    is_deleted = false and (
      visibility = 'public'
      or author_id = auth.uid()
      or (visibility = 'connections' and public.are_connected(author_id, auth.uid()))
      or public.is_admin()
    )
  );
create policy "authors create their own posts"
  on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy "authors update their own posts"
  on public.posts for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "authors or admins delete a post"
  on public.posts for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

create policy "post media follows the parent post's visibility"
  on public.post_media for select to authenticated
  using (exists (
    select 1 from public.posts p where p.id = post_id and p.is_deleted = false and (
      p.visibility = 'public' or p.author_id = auth.uid()
      or (p.visibility = 'connections' and public.are_connected(p.author_id, auth.uid()))
      or public.is_admin()
    )
  ));
create policy "post authors manage their post's media"
  on public.post_media for all to authenticated
  using (exists (select 1 from public.posts where id = post_id and author_id = auth.uid()))
  with check (exists (select 1 from public.posts where id = post_id and author_id = auth.uid()));

create policy "comments follow the parent post's visibility"
  on public.post_comments for select to authenticated
  using (
    is_deleted = false and exists (
      select 1 from public.posts p where p.id = post_id and p.is_deleted = false and (
        p.visibility = 'public' or p.author_id = auth.uid()
        or (p.visibility = 'connections' and public.are_connected(p.author_id, auth.uid()))
        or public.is_admin()
      )
    )
  );
create policy "authenticated users comment on visible posts"
  on public.post_comments for insert to authenticated
  with check (
    author_id = auth.uid() and exists (
      select 1 from public.posts p where p.id = post_id and p.is_deleted = false and (
        p.visibility = 'public' or p.author_id = auth.uid()
        or (p.visibility = 'connections' and public.are_connected(p.author_id, auth.uid()))
      )
    )
  );
create policy "comment authors edit their own comment"
  on public.post_comments for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "comment authors or admins delete a comment"
  on public.post_comments for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

create policy "reactions are visible alongside their post"
  on public.post_reactions for select to authenticated using (true);
create policy "users react once per post"
  on public.post_reactions for insert to authenticated with check (profile_id = auth.uid());
create policy "users change their own reaction"
  on public.post_reactions for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "users remove their own reaction"
  on public.post_reactions for delete to authenticated using (profile_id = auth.uid());

create policy "comment reactions are visible alongside their comment"
  on public.comment_reactions for select to authenticated using (true);
create policy "users react once per comment"
  on public.comment_reactions for insert to authenticated with check (profile_id = auth.uid());
create policy "users remove their own comment reaction"
  on public.comment_reactions for delete to authenticated using (profile_id = auth.uid());
