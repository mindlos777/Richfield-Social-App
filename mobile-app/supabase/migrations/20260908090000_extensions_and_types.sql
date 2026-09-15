-- =====================================================================
-- Richfield Connect — Database Schema
-- Migration 01: Extensions & Custom Types
-- =====================================================================
-- Enables required Postgres extensions and defines every ENUM type
-- used across the schema, plus a shared trigger utility. Every later
-- migration depends on this one running first.
-- =====================================================================

-- Extensions ------------------------------------------------------------
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists pg_trgm;    -- fuzzy / partial text matching, backs our search indexes

-- Enum types --------------------------------------------------------------

create type public.user_role as enum ('student', 'alumni', 'business', 'admin');

create type public.verification_status as enum ('pending', 'verified', 'rejected');

create type public.connection_status as enum ('pending', 'accepted', 'declined', 'blocked');

create type public.post_visibility as enum ('public', 'connections', 'private');

create type public.post_type as enum ('text', 'image', 'video', 'article');

create type public.media_type as enum ('image', 'video', 'document');

create type public.reaction_type as enum ('like', 'celebrate', 'support', 'insightful', 'curious');

create type public.company_member_role as enum ('owner', 'recruiter', 'member');

create type public.opportunity_type as enum ('internship', 'learnership', 'graduate_program', 'part_time', 'full_time', 'contract');

create type public.work_mode as enum ('on_site', 'remote', 'hybrid');

create type public.opportunity_status as enum ('draft', 'pending_approval', 'approved', 'rejected', 'closed', 'filled');

create type public.application_status as enum ('submitted', 'under_review', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn', 'accepted');

create type public.event_type as enum ('workshop', 'career_fair', 'webinar', 'networking', 'info_session', 'other');

create type public.event_status as enum ('draft', 'published', 'cancelled');

create type public.rsvp_status as enum ('interested', 'going', 'attended', 'cancelled');

create type public.announcement_audience as enum ('all', 'students', 'alumni', 'business', 'admin');

create type public.notification_type as enum (
  'connection_request', 'connection_accepted', 'new_message', 'post_reaction',
  'post_comment', 'opportunity_match', 'application_update', 'event_reminder',
  'announcement', 'mention', 'system'
);

create type public.cv_extraction_status as enum ('pending', 'processing', 'completed', 'failed');

create type public.ai_interaction_type as enum (
  'profile_suggestion', 'skill_suggestion', 'career_guidance',
  'cv_extraction', 'bio_generation', 'opportunity_match_explainer'
);

create type public.report_target_type as enum ('post', 'comment', 'profile', 'message', 'company');

create type public.report_status as enum ('pending', 'reviewed', 'actioned', 'dismissed');

-- Shared utility: keep updated_at current on every row update -------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger function: stamps updated_at = now() on every UPDATE. Attach as a BEFORE UPDATE trigger on any table with an updated_at column.';
