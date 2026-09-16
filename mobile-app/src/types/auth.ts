export type UserRole =
  | 'student'
  | 'alumni'
  | 'business'
  | 'staff'
  | 'admin';

export type AccountStatus =
  | 'active'
  | 'pending'
  | 'rejected'
  | 'suspended';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  username?: string | null;

  role: UserRole;
  status: AccountStatus;

  avatar_url?: string | null;
  bio?: string | null;

  linkedin_url?: string | null;
  github_url?: string | null;
  instagram_url?: string | null;
  website_url?: string | null;
  headline?: string | null;

  created_at?: string;
  updated_at?: string;
}