import { supabase } from "../lib/supabase";

export type AppRole =
  | "student"
  | "alumni"
  | "business"
  | "admin";

export async function getCurrentProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getUserRole(): Promise<AppRole | null> {
  const profile = await getCurrentProfile();

  if (!profile) {
    return null;
  }

  return profile.role as AppRole;
}