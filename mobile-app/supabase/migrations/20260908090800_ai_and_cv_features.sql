-- =====================================================================
-- Richfield Connect — Database Schema
-- Migration 09: AI & CV Features
-- =====================================================================
-- Storage for uploaded CVs (and what the extraction pipeline pulled
-- out of them), plus a log of every AI-assistant suggestion made to
-- a profile — useful both for the "profile improvement" feature and
-- for measuring whether the AI's suggestions actually get used.
-- =====================================================================

create table public.cv_documents (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid not null references public.profiles(id) on delete cascade,
  file_url           text not null,
  file_name          text,
  file_size_bytes    bigint,
  extraction_status  public.cv_extraction_status not null default 'pending',
  extracted_data     jsonb,
  is_primary         boolean not null default false,
  uploaded_at        timestamptz not null default now(),
  processed_at       timestamptz
);

create index idx_cv_documents_profile on public.cv_documents(profile_id);

create table public.ai_assistant_interactions (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles(id) on delete cascade,
  interaction_type  public.ai_interaction_type not null,
  input_context     jsonb,
  suggestion        jsonb,
  was_accepted      boolean,
  created_at        timestamptz not null default now()
);

create index idx_ai_interactions_profile on public.ai_assistant_interactions(profile_id, created_at desc);

-- =====================================================================
-- Row Level Security
-- Both tables are personal and stay private to the owner (plus admin
-- for support/moderation) — no one else has a legitimate reason to
-- read someone's CV extraction or AI suggestion history.
-- =====================================================================

alter table public.cv_documents enable row level security;
alter table public.ai_assistant_interactions enable row level security;

create policy "owners and admins view a CV document"
  on public.cv_documents for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
create policy "owners manage their own CV documents"
  on public.cv_documents for insert to authenticated with check (profile_id = auth.uid());
create policy "owners update their own CV documents"
  on public.cv_documents for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "owners delete their own CV documents"
  on public.cv_documents for delete to authenticated using (profile_id = auth.uid());

create policy "owners view their own AI interaction history"
  on public.ai_assistant_interactions for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
create policy "owners log their own AI interactions"
  on public.ai_assistant_interactions for insert to authenticated with check (profile_id = auth.uid());
create policy "owners can update the acceptance flag on their own interactions"
  on public.ai_assistant_interactions for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
