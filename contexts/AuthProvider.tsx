import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { userService } from '@/services/userService';
import { logger } from '@/utils/logger';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null; // Replace 'any' with your UserProfile type
  loading: boolean;
  signIn: (email, password) => Promise<{ error: Error | null }>;
  signUp: (email, password, metadata) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (session?.user) {
          const [error, userProfile] = await userService.getUserById(session.user.id);
          if (error) {
            logger.error('Failed to fetch user profile on auth change', { userId: session.user.id, error });
            setProfile(null);
          } else {
            setProfile(userProfile);
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    logger.authEvent('signin_attempt', undefined, { email });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      logger.authEvent('signin_failed', undefined, { email, error: error.message });
    } else {
      // The onAuthStateChange listener will handle the rest
      logger.authEvent('signin_success');
    }
    return { error };
  };

  const signUp = async (email, password, metadata) => {
    logger.authEvent('signup_attempt', undefined, { email, username: metadata?.username });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    if (error) {
      logger.authEvent('signup_failed', undefined, { email, error: error.message });
    } else {
      // The onAuthStateChange listener will handle the rest
      logger.authEvent('signup_success');
    }
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signInWithGoogle = async () => {
    // Temporarily disable Google Sign-In
    logger.authEvent('google_signin_attempt_disabled');
    const error = new Error(
      'Google Sign-In is temporarily unavailable. Please use email and password.'
    );
    return { error };

    /*
    // To re-enable, remove the code above and uncomment this block:
    logger.authEvent('google_signin_attempt');
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) {
      logger.authEvent('google_signin_failed', undefined, { error: error.message });
      return { error };
    }
    return { error: null };
    */
  };

  const value = { session, user, profile, loading, signIn, signUp, signOut, signInWithGoogle };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};