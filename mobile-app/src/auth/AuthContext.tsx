import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import { Session, User } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import { Profile } from '../types/auth';
import {
  signIn as login,
  signOut as logout,
} from '../services/authService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      setProfile(null);
      return;
    }

    setProfile(data);
  };

  const refreshProfile = async () => {
    if (!user) return;

    await fetchProfile(user.id);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      }

      setLoading(false);
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (
    email: string,
    password: string
  ) => {
    await login(email, password);
  };

  const signOut = async () => {
    await logout();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    );
  }

  return context;
};