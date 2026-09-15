# Richfield Connect — Database Design

Schema for the Supabase (PostgreSQL) backend. 40 tables, 2 analytics views, and 20 enum
types across 12 ordered migrations, plus row-level security and column-level privilege
locks on every table so access control lives in the database, not just the app.

## How it's organized

Each file in `supabase/migrations/` owns one domain and is self-contained: it creates its
own tables, indexes, triggers, and RLS policies. Migrations are numbered so later files can
safely reference tables from earlier ones (e.g. the admin RPCs in migration 10 update
`opportunities`, created in migration 07).

| # | File | Domain |
|---|------|--------|
| 01 | `extensions_and_types` | Postgres extensions, all 20 enums, shared `updated_at` trigger |
| 02 | `identity_and_profiles` | `profiles`, `student_profiles`, `alumni_profiles`, `companies`, `company_members`, `industries` + the security helper functions (`is_admin`, `is_company_member`, `current_user_role`) everything else depends on |
| 03 | `notifications_core` | `notifications`, `push_tokens` + `create_notification()` — placed early because migrations 05–08 all call it from triggers |
| 04 | `skills_and_portfolio` | `skills`, `profile_skills`, `skill_endorsements`, `experience`, `projects`, `project_skills`, `certifications` |
| 05 | `networking_and_feed` | `connections`, `posts`, `post_media`, `post_comments`, `post_reactions`, `comment_reactions` |
| 06 | `messaging` | `conversations`, `conversation_participants`, `messages` |
| 07 | `opportunities_and_applications` | `opportunities`, `opportunity_skills`, `applications`, `opportunity_matches` |
| 08 | `pathways_events_announcements` | `career_pathways` (+ steps + progress), `events`, `event_rsvps`, `announcements` |
| 09 | `ai_and_cv_features` | `cv_documents`, `ai_assistant_interactions` |
| 10 | `analytics_and_moderation` | `profile_views`, `opportunity_views`, 2 analytics views, `reports`, `admin_actions` + every admin-only RPC |
| 11 | `storage_buckets` | 5 storage buckets + path-based ownership policies |
| 12 | `enable_realtime` | Adds the live-update tables to `supabase_realtime` |

`supabase/seed.sql` seeds the two dependency-free lookup tables (`industries`, `skills`).
Career pathways, events, and announcements need a real admin account behind `created_by`,
so those are best created through the app once your team has admin logins.

## Design decisions worth knowing about

**Signup can't grant itself admin.** `handle_new_user()` fires on every `auth.users`
insert and builds the matching `profiles` row automatically. If the client's signup
metadata claims `role: "admin"`, the trigger silently downgrades it to `student` — admin
has to be promoted by an existing admin (`admin_set_user_active` and friends in migration
10), never claimed at signup.

**Two layers of write protection, not one.** RLS controls *which rows* a user can touch.
For the handful of fields that must never be client-settable at all — `role`,
`verification_status`, `is_active` on profiles; `verification_status` on companies;
`status`/`approved_by` on opportunities — we also `revoke`/`grant` at the *column* level.
`applications.status` gets the strictest treatment: zero direct grants, full stop. Every
status change goes through a `security definer` RPC (`update_application_status`,
`admin_review_opportunity`, etc.), so state transitions are deliberate, validated, and — for
the admin ones — logged to `admin_actions` automatically.

**Notifications are database-triggered, not app-triggered.** A connection accepted, a new
message, a post reaction/comment, an application status change, an opportunity match, an
announcement going live — each one inserts a `notifications` row via a trigger sitting
right next to the table that causes it (or, for RPC-only tables like `applications`, inside
the RPC itself). The client just subscribes to Realtime on `notifications` and it's covered
regardless of which code path made the change.

**Full-text search is built in.** `profiles`, `companies`, and `opportunities` each have a
generated `tsvector` column with GIN indexes — "discover Richfield talent" and opportunity
search work out of the box without a separate search service.

**Counters are denormalized on purpose.** `posts.like_count`/`comment_count`,
`opportunities.application_count`, `events.rsvp_count` are maintained by triggers so the
feed never runs `COUNT(*)` on render.

**Cascade behavior is intentional, not default.** Content people own (posts, applications,
messages, connections) is `on delete cascade` from `profiles` — delete your account, your
content goes with it. Fields recording what an *admin or reviewer did* (`approved_by`,
`verified_by`, `reviewed_by`, `admin_id`) are `on delete set null` instead — the audit trail
survives even if that staff member's account is later removed.

**Analytics views respect RLS.** Both `profile_analytics_summary` and
`company_opportunity_analytics` are created `with (security_invoker = true)`, so querying
them re-checks the querying user's own row-level permissions instead of running with the
view owner's privileges. Without this they'd quietly leak data past every policy above them.

## Applying it

1. Copy `supabase/` into your repo root (alongside `app/`, `src/`, etc. from the README).
2. `supabase link --project-ref <your-project-ref>`
3. `supabase db push` — applies all 12 migrations in order.
4. `supabase db push --include-seed` (or run `seed.sql` in the SQL editor) for the
   industries/skills starter data.
5. `supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts`
   for types matching `src/lib/supabase.ts`.

Treat these 12 files as history — once merged, don't edit them. Future schema changes are
new migration files with a later timestamp, same as any team using the Supabase CLI.

## What's deliberately out of scope

- **Opportunity matching itself.** `opportunity_matches` stores results (score, matched
  skills); the model/heuristic that populates it is application logic — a scheduled edge
  function or backend job using the `service_role` key (which bypasses RLS entirely, as
  intended for backend jobs).
- **CV extraction.** `cv_documents.extracted_data` is where the parsed output lands; the
  parsing itself is presumably an edge function or external service.
- **Event reminders.** Notifying RSVP'd users *N* hours before an event needs a scheduled
  job (Supabase supports `pg_cron` as an extension), not a trigger, since nothing "happens"
  in the database at reminder time — worth adding once the core app is working.
- **Private post media.** See the trade-off noted in migration 11 — public-read storage
  with unguessable paths, not true access control at the file layer.
