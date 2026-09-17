import React, {
  createContext,
  useCallback,
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

  refreshProfile: () => Promise<Profile | null>;

  isAuthenticated: boolean;

  isStudent: boolean;
  isAlumni: boolean;
  isStaff: boolean;
  isBusiness: boolean;
  isAdmin: boolean;

  isActive: boolean;
  isPending: boolean;
  isRejected: boolean;
  isSuspended: boolean;

  isStaffVerified: boolean;
  staffVerificationLoading: boolean;
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

  const [
    isStaffVerified,
    setIsStaffVerified,
  ] = useState(false);

  const [
    staffVerificationLoading,
    setStaffVerificationLoading,
  ] = useState(false);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsStaffVerified(false);
    setStaffVerificationLoading(false);
  }, []);

  const fetchStaffVerification =
    useCallback(
      async (
        userId: string,
        role?: string
      ): Promise<boolean> => {
        if (role !== "staff") {
          setIsStaffVerified(false);
          return false;
        }

        try {
          setStaffVerificationLoading(true);

          const { data, error } =
            await supabase
              .from("staff_profiles")
              .select("verified")
              .eq("user_id", userId)
              .maybeSingle();

          if (error) {
            console.log(
              "Staff verification fetch error:",
              error
            );

            setIsStaffVerified(false);

            return false;
          }

          const verified =
            data?.verified === true;

          setIsStaffVerified(verified);

          return verified;
        } catch (error) {
          console.log(
            "Staff verification fetch exception:",
            error
          );

          setIsStaffVerified(false);

          return false;
        } finally {
          setStaffVerificationLoading(false);
        }
      },
      []
    );

  const fetchProfile = useCallback(
    async (
      userId: string
    ): Promise<Profile | null> => {
      try {
        const { data, error } =
          await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();

        if (error) {
          console.log(
            "Profile fetch error:",
            error
          );

          setProfile(null);
          setIsStaffVerified(false);

          return null;
        }

        if (!data) {
          console.log(
            "Profile not found for:",
            userId
          );

          setProfile(null);
          setIsStaffVerified(false);

          return null;
        }

        const userProfile =
          data as Profile;

        setProfile(userProfile);

        await fetchStaffVerification(
          userId,
          userProfile.role
        );

        return userProfile;
      } catch (error) {
        console.log(
          "Profile fetch exception:",
          error
        );

        setProfile(null);
        setIsStaffVerified(false);

        return null;
      }
    },
    [fetchStaffVerification]
  );

  const refreshProfile =
    useCallback(async () => {
      if (!user) {
        return null;
      }

      return await fetchProfile(
        user.id
      );
    }, [user, fetchProfile]);

  const signIn = async (
    email: string,
    password: string
  ): Promise<Profile> => {
    const safeEmail =
      email.trim().toLowerCase();

    const loggedInUser =
      await login(
        safeEmail,
        password
      );

    if (!loggedInUser) {
      throw new Error(
        "Unable to sign in."
      );
    }

    const currentSession =
      loggedInUser.session ?? null;

    const currentUser =
      loggedInUser.user;

    setSession(currentSession);
    setUser(currentUser);

    const userProfile =
      await fetchProfile(
        currentUser.id
      );

    if (!userProfile) {
      await supabase.auth.signOut();

      clearAuthState();

      throw new Error(
        "Your account profile could not be found. Please contact support."
      );
    }

    /*
      Suspended accounts must never enter the app.
    */

    if (
      userProfile.status ===
      "suspended"
    ) {
      await supabase.auth.signOut();

      clearAuthState();

      throw new Error(
        "Your account has been suspended. Please contact Richfield support."
      );
    }

    /*
      STUDENT

      Students currently become active immediately.

      If a Student somehow has another status,
      do not allow access.
    */

    if (
      userProfile.role === "student" &&
      userProfile.status !== "active"
    ) {
      await supabase.auth.signOut();

      clearAuthState();

      throw new Error(
        `Your Student account is currently ${userProfile.status}.`
      );
    }

    /*
      ALUMNI

      Alumni currently use the pending verification
      system.

      Until we create the Alumni pending screen,
      pending/rejected Alumni remain blocked here.
    */

    if (
      userProfile.role === "alumni" &&
      userProfile.status !== "active"
    ) {
      await supabase.auth.signOut();

      clearAuthState();

      throw new Error(
        `Your Alumni account is currently ${userProfile.status}.`
      );
    }

    /*
      BUSINESS

      Business already has its own authentication
      and verification flow.

      Keep inactive Business accounts out of the
      normal authenticated application.
    */

    if (
      userProfile.role === "business" &&
      userProfile.status !== "active"
    ) {
      await supabase.auth.signOut();

      clearAuthState();

      throw new Error(
        `Your Business account is currently ${userProfile.status}.`
      );
    }

    /*
      STAFF

      IMPORTANT:

      Pending and rejected Staff accounts remain
      authenticated.

      This allows LoginScreen to route them to:

      /(staff)/pending

      where they can upload/replace their private
      verification document.

      They still cannot enter Staff tabs because
      route protection will check:

      role === staff
      status === active
      verified === true
    */

    if (
      (userProfile.role as string) === "staff"
    ) {
      if (
        ![
          "active",
          "pending",
          "rejected",
        ].includes(
          userProfile.status
        )
      ) {
        await supabase.auth.signOut();

        clearAuthState();

        throw new Error(
          "Your Staff account cannot currently be accessed."
        );
      }

      return userProfile;
    }

    /*
      ADMIN

      Only active Administrators can continue.
    */

    if (
      userProfile.role === "admin" &&
      userProfile.status !== "active"
    ) {
      await supabase.auth.signOut();

      clearAuthState();

      throw new Error(
        "Your Administrator account is not active."
      );
    }

    return userProfile;
  };

  const signInWithMicrosoft =
    async () => {
      const redirectTo =
        "richfieldsocial://auth/callback";

      const { data, error } =
        await supabase.auth.signInWithOAuth(
          {
            provider: "azure",
            options: {
              redirectTo,
              scopes: "email",
              skipBrowserRedirect: true,
            },
          }
        );

      if (error) {
        throw error;
      }

      if (!data?.url) {
        throw new Error(
          "Microsoft login could not be started."
        );
      }

      void data.url;
    };

  const signOut = async () => {
    try {
      await logout();
    } finally {
      clearAuthState();
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth =
      async () => {
        try {
          const {
            data: {
              session:
                existingSession,
            },
            error,
          } =
            await supabase.auth.getSession();

          if (error) {
            console.log(
              "Session error:",
              error
            );
          }

          if (!mounted) {
            return;
          }

          setSession(
            existingSession
          );

          setUser(
            existingSession?.user ??
              null
          );

          if (
            existingSession?.user
          ) {
            await fetchProfile(
              existingSession.user.id
            );
          } else {
            setProfile(null);
            setIsStaffVerified(false);
          }
        } catch (error) {
          console.log(
            "Auth initialization error:",
            error
          );

          if (mounted) {
            clearAuthState();
          }
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
          newSession
        ) => {
          if (!mounted) {
            return;
          }

          console.log(
            "Auth event:",
            event
          );

          setSession(newSession);

          setUser(
            newSession?.user ??
              null
          );

          if (
            newSession?.user
          ) {
            await fetchProfile(
              newSession.user.id
            );
          } else {
            setProfile(null);
            setIsStaffVerified(false);
          }

          if (mounted) {
            setLoading(false);
          }
        }
      );

    return () => {
      mounted = false;

      subscription.unsubscribe();
    };
  }, [
    clearAuthState,
    fetchProfile,
  ]);

  const isAuthenticated =
    !!session && !!user;

  const isStudent =
    profile?.role === "student";

  const isAlumni =
    profile?.role === "alumni";

  const isStaff =
    (profile?.role as string | undefined) ===
    "staff";

  const isBusiness =
    profile?.role === "business";

  const isAdmin =
    profile?.role === "admin";

  const isActive =
    profile?.status === "active";

  const isPending =
    profile?.status === "pending";

  const isRejected =
    profile?.status === "rejected";

  const isSuspended =
    profile?.status === "suspended";

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

        isAuthenticated,

        isStudent,
        isAlumni,
        isStaff,
        isBusiness,
        isAdmin,

        isActive,
        isPending,
        isRejected,
        isSuspended,

        isStaffVerified,
        staffVerificationLoading,
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