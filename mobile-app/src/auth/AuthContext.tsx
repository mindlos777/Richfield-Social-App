import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  Session,
  User,
} from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";
import { Profile } from "../types/auth";
import {
  signIn as login,
  signOut as logout,
} from "../services/authService";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;

  signIn: (
    email: string,
    password: string
  ) => Promise<Profile>;

  signInWithMicrosoft: () => Promise<void>;

  signOut: () => Promise<void>;

  refreshProfile: () => Promise<void>;
}

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  );

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, setUser] =
    useState<User | null>(null);

  const [session, setSession] =
    useState<Session | null>(null);

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [loading, setLoading] =
    useState(true);

  const fetchProfile = async (
    userId: string
  ): Promise<Profile | null> => {
    try {
      const { data, error } =
        await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

      if (error) {
        console.log(
          "Profile fetch error:",
          error
        );

        setProfile(null);
        return null;
      }

      setProfile(data);

      return data as Profile;
    } catch (error) {
      console.log(
        "Profile fetch exception:",
        error
      );

      setProfile(null);

      return null;
    }
  };

  const refreshProfile = async () => {
    if (!user) return;

    await fetchProfile(user.id);
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<Profile> => {
    const loggedInUser = await login(
      email.trim().toLowerCase(),
      password
    );

    if (!loggedInUser) {
      throw new Error(
        "Unable to sign in."
      );
    }

    const userProfile =
      await fetchProfile(
        loggedInUser.user.id
      );

    if (!userProfile) {
      await supabase.auth.signOut();

      throw new Error(
        "Your account profile could not be found. Please contact support."
      );
    }

    if (userProfile.status !== "active") {
      await supabase.auth.signOut();

      throw new Error(
        `Your account is currently ${userProfile.status}.`
      );
    }

    return userProfile;
  };

  const signInWithMicrosoft = async () => {
    const redirectTo = "richfieldsocial://auth/callback";

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo,
        scopes: "email",
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      throw error;
    }

    if (!data?.url) {
      throw new Error("Microsoft login could not be started.");
    }

    void data.url;
  };

  const signOut = async () => {
    await logout();

    setUser(null);
    setSession(null);
    setProfile(null);
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth =
      async () => {
        try {
          const {
            data: { session },
            error,
          } =
            await supabase.auth.getSession();

          if (error) {
            console.log(
              "Session error:",
              error
            );
          }

          if (!mounted) return;

          setSession(session);
          setUser(
            session?.user ?? null
          );

          if (session?.user) {
            await fetchProfile(
              session.user.id
            );
          }
        } catch (error) {
          console.log(
            "Auth initialization error:",
            error
          );
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    initializeAuth();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        async (
          event,
          session
        ) => {
          if (!mounted) return;

          console.log(
            "Auth event:",
            event
          );

          setSession(session);
          setUser(
            session?.user ?? null
          );

          if (session?.user) {
            await fetchProfile(
              session.user.id
            );
          } else {
            setProfile(null);
          }

          setLoading(false);
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signInWithMicrosoft,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
};