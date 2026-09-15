-- =====================================================================
-- Richfield Connect — Database Schema
-- Migration 12: Enable Realtime
-- =====================================================================
-- Adds the tables behind the README's "Real-Time Features" list to the
-- supabase_realtime publication. Client subscribes per-table, e.g.:
--   supabase.channel('messages').on('postgres_changes',
--     { event: 'INSERT', schema: 'public', table: 'messages',
--       filter: `conversation_id=eq.${conversationId}` }, handler)
-- Run last: needs every table below to already exist.
-- =====================================================================

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.connections;
alter publication supabase_realtime add table public.post_comments;
alter publication supabase_realtime add table public.post_reactions;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.announcements;
alter publication supabase_realtime add table public.applications;
