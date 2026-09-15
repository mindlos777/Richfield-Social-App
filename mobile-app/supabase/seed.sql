-- =====================================================================
-- Richfield Connect — Seed Data
-- =====================================================================
-- Only seeds tables with no dependency on a real user account
-- (industries, skills). Career pathways, events, and announcements all
-- need a real admin profile_id and are better created once your team
-- has real admin accounts — either through the app itself or with a
-- quick one-off insert once you know that admin's id.
--
-- Runs automatically with `supabase db reset`, or manually with
-- `supabase db push --include-seed` / by pasting into the SQL editor.
-- =====================================================================

insert into public.industries (name) values
  ('Technology'), ('Finance & Banking'), ('Healthcare'), ('Education'),
  ('Engineering'), ('Marketing & Advertising'), ('Retail & E-commerce'),
  ('Manufacturing'), ('Consulting'), ('Media & Entertainment'),
  ('Non-Profit'), ('Government & Public Sector'), ('Agriculture'),
  ('Construction'), ('Telecommunications'), ('Hospitality & Tourism'),
  ('Legal'), ('Energy & Utilities'), ('Logistics & Transport'), ('Other')
on conflict (name) do nothing;

insert into public.skills (name, category) values
  -- Programming languages
  ('JavaScript', 'technical'), ('TypeScript', 'technical'), ('Python', 'technical'),
  ('Java', 'technical'), ('C++', 'technical'), ('C#', 'technical'), ('SQL', 'technical'),
  ('Swift', 'technical'), ('Kotlin', 'technical'),
  -- Frameworks & platforms
  ('React', 'technical'), ('React Native', 'technical'), ('Node.js', 'technical'),
  ('Expo', 'technical'), ('Django', 'technical'), ('Spring Boot', 'technical'),
  ('.NET', 'technical'),
  -- Data & AI
  ('Machine Learning', 'technical'), ('Data Analysis', 'technical'),
  ('Data Visualization', 'technical'), ('Artificial Intelligence', 'technical'),
  -- Infra & tools
  ('Git', 'tool'), ('Docker', 'tool'), ('Supabase', 'tool'), ('AWS', 'tool'),
  ('Figma', 'tool'), ('PostgreSQL', 'tool'),
  -- Design
  ('UI/UX Design', 'technical'), ('Graphic Design', 'technical'),
  -- Business
  ('Project Management', 'soft'), ('Digital Marketing', 'technical'),
  ('Financial Analysis', 'technical'), ('Business Analysis', 'technical'),
  -- Soft skills
  ('Communication', 'soft'), ('Leadership', 'soft'), ('Teamwork', 'soft'),
  ('Problem Solving', 'soft'), ('Time Management', 'soft'), ('Public Speaking', 'soft'),
  ('Critical Thinking', 'soft'), ('Adaptability', 'soft'),
  -- Languages
  ('English', 'language'), ('Afrikaans', 'language'), ('Zulu', 'language'), ('Xhosa', 'language')
on conflict (name) do nothing;
