# Richfield Social

Richfield Social is a mobile-first networking and career platform for
the Richfield community. It connects Students, Alumni, Businesses and
Administrators in one role-based application.

## Problem

Students and graduates often use separate platforms for networking,
portfolios, career opportunities, events and communication. Businesses
need a direct way to discover suitable Richfield talent, while the
institution needs controlled verification, moderation and opportunity
approval. Richfield Social brings these functions into one mobile
platform.

## User Types

### Student

Students can build professional profiles, add skills and career
interests, create portfolio items and posts, follow community members,
message Students and Alumni, discover approved opportunities, view
events, use the AI assistant, view analytics, endorse skills and write
recommendations.

### Alumni

Alumni share the community experience with Students while adding
graduate and career information. Alumni accounts use a verification
flow. Alumni can network, post, message, discover opportunities, use the
AI assistant, view analytics and give or receive endorsements and
recommendations.

### Business

Business accounts use a role-specific interface and an approval flow.
Businesses can maintain a company profile, discover talent, create
opportunities for Administrator approval, review applications and view
hiring analytics.

### Administrator

Administrators are provisioned separately rather than through public
signup. They can review accounts, verify Alumni and Businesses,
suspend/remove accounts, moderate content, review opportunities, manage
events and access platform analytics.

## Core Features

-   Supabase Authentication and backend role checks
-   Student, Alumni, Business and Administrator roles
-   Alumni verification and Business approval
-   Student/Alumni professional profiles
-   Business company profiles
-   Social posts, images and short-form video
-   Likes, comments and shares
-   Network discovery and following
-   Direct messaging
-   Portfolio items
-   Skill endorsements and written recommendations
-   Opportunities, approval and applications
-   Institutional events
-   AI assistant
-   Student/Alumni, Business and Administrator analytics
-   Supabase Realtime subscriptions

## Technology Stack

### Mobile

-   React Native
-   Expo
-   Expo Router
-   TypeScript / JavaScript

React Native with Expo supports rapid mobile-first Android/iOS
development from a shared codebase. Expo Router provides file-based
routing and clean role-specific route groups.

### Backend

-   Supabase Authentication
-   PostgreSQL
-   Row Level Security
-   Supabase Realtime
-   Supabase Storage
-   Supabase Edge Functions

PostgreSQL fits the strongly related data model: users, role profiles,
follows, posts, interactions, opportunities, applications, endorsements
and recommendations. Supabase adds authentication, RLS, storage,
realtime and backend functions.

### AI

-   OpenAI API
-   Supabase Edge Functions

AI requests are sent through backend Edge Functions so the OpenAI API
key is never stored in the Expo client.

## Architecture

``` text
                    RICHFIELD SOCIAL
                           |
                    Supabase Auth
                           |
                     profiles table
                           |
              +------------+------------+
              |            |            |
           Student       Alumni      Business
              |            |            |
              +------ Shared Community -+
                    (Student + Alumni)
                           |
          +----------------+-----------------+
          |                |                 |
        Posts           Network          Messaging
          |                                  |
     Likes/Comments                       Realtime
     Shares/Media
                           |
                    Opportunities
                           |
                    Business creates
                           |
                    Admin approves
                           |
                    Students/Alumni
                       discover jobs

                    ADMIN CONTROL
                           |
          +----------------+----------------+
       Accounts        Opportunities       Events
       Reviews          Moderation        Content
                           |
                       Analytics
```

## Authentication and Routing

`profiles.role` is the authoritative role.

Roles: `student`, `alumni`, `business`, `admin`.

Account statuses include: `active`, `pending`, `rejected`, `suspended`.

``` text
Student  -> /(tabs)
Alumni   -> /(tabs)
Business -> /(business-auth)/(tabs)/dashboard
Admin    -> /(admin)/(tabs)/feed
```

Students and Alumni intentionally share the main community interface.
Role-specific information comes from `student_profiles` and
`alumni_profiles`. A Student is not automatically converted to Alumni
only because a graduation date/year passes.

## Database Overview

Important tables include: - `profiles` - `student_profiles` -
`alumni_profiles` - `business_profiles` - `follows` - `posts` -
`post_likes` - `post_comments` - `post_shares` - `portfolio_items` -
`opportunities` - `opportunity_applications` - `skill_endorsements` -
`recommendations`

Other deployed tables may support messaging, events, notifications and
AI history.

## Security

Security is enforced in the backend rather than relying only on hidden
screens.

-   Supabase Authentication
-   Row Level Security
-   Role/status checks
-   Foreign keys and database constraints
-   Private storage for sensitive Business verification documents
-   Server-side AI requests
-   No OpenAI secret in Expo
-   No hard-coded Administrator login
-   Separate Administrator provisioning
-   Ownership checks for user-generated data
-   No self-endorsement or self-recommendation
-   Duplicate skill endorsements blocked by database constraint

## Analytics

### Student / Alumni

Posts, likes, comments, shares, followers, following, portfolio activity
and engagement trends.

### Business

Active opportunities, applications, shortlisted/accepted applicants,
application pipeline and opportunity performance.

### Administrator

User distribution, posts, engagement, opportunities, account statuses,
pending reviews and platform trends.

Analytics should use real database values rather than invented metrics.

## Installation

``` bash
git clone YOUR_REPOSITORY_URL
cd YOUR_PROJECT_FOLDER
npm install
npx expo start --clear
```

Configure the Supabase client with the project URL and public client
key. Never place service-role keys or OpenAI secret keys in the Expo
application.

## Supabase Setup

1.  Configure the Supabase project.
2.  Apply the project schema and RLS policies.
3.  Configure Authentication.
4.  Configure required Storage buckets/policies.
5.  Deploy required Edge Functions.
6.  Add backend secrets through Supabase secrets.
7.  Test all four roles using real accounts.

## Collaboration

``` bash
git fetch origin
git switch YOUR_BRANCH
git pull origin YOUR_BRANCH
```

After changes:

``` bash
git add .
git commit -m "Describe changes"
git push
```

Each collaborator should commit using their own GitHub account so
contribution history clearly shows distributed work.

## Demo Checklist

Verify Student, Alumni, Business and Administrator login/routing;
profiles; network/following; endorsements/recommendations;
posts/interactions; messaging; portfolio; opportunities and approval;
events; AI assistant; all role dashboards; and logout.

## Privacy and POPIA

The platform should collect only data required for its functions,
protect it with authentication/authorization, restrict sensitive
verification information, use least-privilege access and explain why
personal information is collected. Production deployment should include
appropriate consent, correction, retention and deletion procedures
aligned with POPIA.

## Project Status

Hackathon prototype. The main submitted product is the mobile
application and all four required roles should be tested end-to-end
before demonstration.
