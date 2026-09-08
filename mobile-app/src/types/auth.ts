export type UserRole =
  | 'student'
  | 'alumni'
  | 'business'
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
  role: UserRole;
  status: AccountStatus;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}