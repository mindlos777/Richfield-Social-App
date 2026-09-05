# Richfield-Social-App

A professional networking and career development mobile application built for the Richfield community.

Richfield Connect connects **students, alumni, recruiters, and industry partners** in one trusted professional ecosystem. Students can build professional profiles, discover career opportunities, connect with alumni, showcase projects and achievements and develop their professional network before graduation.

---

## Features

- Student, Alumni, Business and Administrator accounts
- Secure authentication and role-based access
- Professional student and alumni profiles
- Company profiles for recruiters and businesses
- Professional networking and connection requests
- Posts, comments and reactions
- Direct messaging
- Internships, learnerships and graduate opportunities
- Smart opportunity matching
- Career pathway exploration
- Richfield events and announcements
- AI-powered profile assistant
- CV/profile information extraction
- Profile analytics
- Business analytics
- Administrator dashboard
- Real-time notifications
- Short-form professional videos

---

## Tech Stack

### Mobile Application

- React Native
- Expo
- TypeScript
- Expo Router

### Backend

- Supabase
- PostgreSQL
- Supabase Authentication
- Supabase Storage
- Supabase Realtime
- Supabase Row Level Security (RLS)

### Development

- Git & GitHub
- Visual Studio Code
- Expo Go

---

# Getting Started

## 1. Prerequisites

Make sure you have the following installed:

- Node.js
- npm
- Git
- Visual Studio Code
- Expo Go on your Android/iOS device

You can check your installations with:

```bash
node -v
npm -v
git --version
```

---

# 2. Clone the Repository

```bash
git clone https://github.com/YOUR-USERNAME/richfield-connect.git
```

Move into the project:

```bash
cd richfield-connect
```

---

# 3. Install Dependencies

Install the project's existing dependencies:

```bash
npm install
```

If you are creating the Expo project from scratch, you can create it using:

```bash
npx create-expo-app@latest
```

Then enter the project:

```bash
cd richfield-connect
```

---

# 4. Install Expo Libraries

Install Expo Router:

```bash
npx expo install expo-router
```

Install Supabase:

```bash
npm install @supabase/supabase-js
```

Install Supabase authentication dependencies:

```bash
npx expo install @react-native-async-storage/async-storage react-native-url-polyfill
```

Install Expo Notifications:

```bash
npx expo install expo-notifications
```

Install image picker:

```bash
npx expo install expo-image-picker
```

Install document picker for CV uploads:

```bash
npx expo install expo-document-picker
```

Install video support:

```bash
npx expo install expo-video
```

Install secure storage:

```bash
npx expo install expo-secure-store
```

Install device/network utilities if required:

```bash
npx expo install expo-device
```

---

# 5. Supabase Setup

Create a Supabase project and obtain the following:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
```

Create a `.env` file in the root of the project:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Never commit your `.env` file to GitHub.**

Add this to `.gitignore`:

```gitignore
.env
.env.local
```

---

# 6. Supabase Client

Create:

```text
src/
└── lib/
    └── supabase.ts
```

Example:

```typescript
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

---

# 7. Start the Application

Start Expo:

```bash
npx expo start
```

You can then:

- Scan the QR code using Expo Go
- Press `a` to open Android
- Press `i` to open iOS Simulator
- Press `w` to open the web version for development/testing

If you experience caching issues:

```bash
npx expo start --clear
```

---

# Project Structure

```text
richfield-connect/
│
├── app/
│   ├── (auth)/
│   ├── (tabs)/
│   ├── profile/
│   ├── opportunities/
│   ├── messages/
│   └── events/
│
├── src/
│   ├── components/
│   ├── services/
│   ├── lib/
│   │   └── supabase.ts
│   ├── hooks/
│   ├── context/
│   ├── types/
│   └── utils/
│
├── assets/
│
├── .env
├── .gitignore
├── app.json
├── package.json
└── README.md
```

---

# User Roles

Richfield Connect supports four main user types:

### Student

Students can:

- Create a professional profile
- Build their portfolio
- Connect with other users
- Discover opportunities
- Apply for opportunities
- Follow career pathways
- Interact with alumni and industry

### Alumni

Alumni can:

- Create professional profiles
- Share career experiences
- Connect with students
- Provide recommendations
- Mentor students
- Discover opportunities

### Business

Verified businesses and recruiters can:

- Create company profiles
- Discover Richfield talent
- Post opportunities
- Manage applicants
- View recruitment analytics

### Administrator

Administrators can:

- Manage users
- Verify alumni
- Approve businesses
- Moderate content
- Approve opportunities
- Manage institutional events
- View platform analytics
- Broadcast announcements

---

# Security

The application uses Supabase Authentication and PostgreSQL Row Level Security (RLS).

Role-based access control is enforced on the backend.

Users should only be able to access information and functionality permitted by their role.

---

# Real-Time Features

Richfield Connect uses real-time functionality for:

- Messages
- Connection requests
- Comments
- Reactions
- Opportunity notifications
- Announcements
- Other account activity

---

# AI Features

The application includes AI-assisted functionality for:

- Profile building
- CV information extraction
- Skill suggestions
- Career guidance
- Profile improvement recommendations
- Opportunity matching

AI features are designed to assist users rather than replace their control over their profile.

---

# Development

Create a new branch before working on a feature:

```bash
git checkout -b feature/your-feature-name
```

Example:

```bash
git checkout -b feature/profile-screen
```

After making changes:

```bash
git add .
git commit -m "Add profile screen"
git push origin feature/profile-screen
```

Create a Pull Request on GitHub when the feature is ready for review.

---

# Team Contribution

All team members should work using separate branches and make meaningful commits.

Recommended workflow:

```text
main
 │
 ├── feature/authentication
 ├── feature/profile
 ├── feature/opportunities
 ├── feature/network
 ├── feature/messaging
 ├── feature/analytics
 └── feature/admin
```

Do not work directly on the `main` branch unless specifically agreed by the team.

---

# Project Status

 **Currently in development**

Richfield Connect is being developed as part of the **2026 Richfield Hackathon**.

---

## Contributors

Built by the Richfield Hackathon Team.

More information about individual contributors and their roles will be added as development progresses.

---

## License

This project is currently intended for educational and hackathon purposes.
