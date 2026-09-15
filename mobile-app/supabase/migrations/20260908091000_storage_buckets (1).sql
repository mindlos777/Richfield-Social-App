-- =====================================================================
-- Richfield Connect — Database Schema
-- Migration 11: Storage Buckets
-- =====================================================================
-- Five buckets. Four are public-read (avatars, company logos, post
-- media, event banners) with writes restricted to the owning
-- user/company via a "<bucket>/<owner-id>/<filename>" path convention,
-- checked with storage.foldername(). CVs are private: readable only by
-- their owner and admins.
--
-- Trade-off worth knowing: post-media is public-read at the storage
-- layer even though a *post* can be 'connections' or 'private'. The
-- posts/post_media table RLS already hides the post itself from the
-- wrong audience; someone would need to already know (or guess) the
-- exact file URL to bypass that. Good enough for a hackathon — if you
-- need real defense on media for private posts later, switch that
-- bucket to private and serve it through signed URLs instead.
-- =====================================================================

insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('company-logos', 'company-logos', true),
  ('post-media', 'post-media', true),
  ('event-banners', 'event-banners', true),
  ('cv-documents', 'cv-documents', false);

-- ---- avatars: <user_id>/<filename>, public read, owner write ----------
create policy "avatars are publicly readable"
  on storage.objects for select using (bucket_id = 'avatars');
create policy "users upload to their own avatar folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users manage their own avatar files"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete their own avatar files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---- company-logos: <company_id>/<filename>, public read, member write ----
create policy "company logos are publicly readable"
  on storage.objects for select using (bucket_id = 'company-logos');
create policy "company members upload their company's logo"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'company-logos' and public.is_company_member(((storage.foldername(name))[1])::uuid));
create policy "company members manage their company's logo"
  on storage.objects for update to authenticated
  using (bucket_id = 'company-logos' and public.is_company_member(((storage.foldername(name))[1])::uuid));
create policy "company members delete their company's logo"
  on storage.objects for delete to authenticated
  using (bucket_id = 'company-logos' and public.is_company_member(((storage.foldername(name))[1])::uuid));

-- ---- post-media: <user_id>/<filename>, public read, owner write ----
create policy "post media is publicly readable"
  on storage.objects for select using (bucket_id = 'post-media');
create policy "users upload to their own post-media folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete their own post media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---- event-banners: admin-managed, public read ----
create policy "event banners are publicly readable"
  on storage.objects for select using (bucket_id = 'event-banners');
create policy "admins manage event banners"
  on storage.objects for all to authenticated
  using (bucket_id = 'event-banners' and public.is_admin())
  with check (bucket_id = 'event-banners' and public.is_admin());

-- ---- cv-documents: <user_id>/<filename>, private ----
create policy "owners and admins read a CV file"
  on storage.objects for select to authenticated
  using (bucket_id = 'cv-documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "users upload to their own CV folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'cv-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users manage their own CV files"
  on storage.objects for update to authenticated
  using (bucket_id = 'cv-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete their own CV files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'cv-documents' and (storage.foldername(name))[1] = auth.uid()::text);
