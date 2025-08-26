// src/contexts/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type UserProfile = Database['public']['Tables']['users']['Row'];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  /** ✅ Use this for Join/Login vs Profile UI */
  isAuthenticated: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  fetchProfile: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user);
      } else {
        // 🔒 make sure nothing stale leaks into UI
        setProfile(null);
        setLoading(false);
      }
    });

    // listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        await fetchProfile(nextSession.user);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (user: User) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
      } else if (!data) {
        // create a default profile if missing
        const defaultUsername = user.email ? user.email.split('@')[0] : `user_${user.id.substring(0, 8)}`;
        const { data: newProfile, error: newProfileError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            username: defaultUsername,
            email: user.email || '',
            role: 'user',
            is_verified_business: false,
            status: 'active',
            reputation: 0,
            total_posts: 0,
          })
          .select('*')
          .single();

        if (newProfileError) {
          console.error('Error creating new profile:', newProfileError);
          setProfile(null);
        } else {
          setProfile(newProfile);
        }
      } else {
        setProfile(data);
      }
    } catch (e) {
      console.error('Unexpected error in fetchProfile:', e);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      if (!email.trim() || !password.trim() || !username.trim()) {
        return { error: { code: 'validation_error', message: 'Please fill in all fields to create your account.' } };
      }
      if (username.trim().length < 3) {
        return { error: { code: 'username_too_short', message: 'Username must be at least 3 characters long.' } };
      }
      if (!email.includes('@')) {
        return { error: { code: 'invalid_email', message: 'Please enter a valid email address.' } };
      }
      if (password.length < 6) {
        return { error: { code: 'weak_password', message: 'Password must be at least 6 characters long for security.' } };
      }

      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .maybeSingle();

      if (existingUser) {
        return { error: { code: 'username_taken', message: 'Username already taken. Please choose a different username.' } };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });

      if (error) {
        console.error('Supabase signup error:', error);
        if (error.message.match(/already.*registered|user_already_exists/i)) {
          return { error: { code: 'user_already_exists', message: 'An account with this email already exists. Please sign in instead.' } };
        }
        if (error.message.match(/password|at least/i)) {
          return { error: { code: 'weak_password', message: 'Password must be at least 6 characters long for security.' } };
        }
        if (error.message.match(/invalid.*email/i)) {
          return { error: { code: 'invalid_email', message: 'Please enter a valid email address.' } };
        }
        if (error.message.match(/rate.*limit|too many/i)) {
          return { error: { code: 'rate_limit', message: 'Too many signup attempts. Please wait a few minutes and try again.' } };
        }
        return { error: { code: 'signup_failed', message: `Account creation failed: ${error.message}` } };
      }

      if (!error && data.user) {
        const { error: profileError } = await supabase.from('users').insert({
          id: data.user.id,
          username,
          email,
          role: 'user',
          is_verified_business: false,
          status: 'active',
          reputation: 0,
          total_posts: 0,
        });
        if (profileError) {
          console.error('Error creating user profile:', profileError);
          return { error: { code: 'profile_creation_failed', message: 'Account created, but profile setup failed. Please try signing in.' } };
        }
      }

      return { error };
    } catch (e) {
      console.error('Unexpected signup error:', e);
      return { error: { code: 'unexpected_error', message: 'An unexpected error occurred. Please try again.' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      if (!email.trim() || !password.trim()) {
        return { error: { code: 'validation_error', message: 'Please enter both email and password to continue.' } };
      }
      if (!email.includes('@')) {
        return { error: { code: 'invalid_email', message: 'Please enter a valid email address.' } };
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('email, username, status')
        .eq('email', email)
        .maybeSingle();

      if (userProfile?.status === 'banned') {
        return { error: { code: 'account_banned', message: 'Your account has been suspended. Please contact support.' } };
      }
      if (userProfile?.status === 'suspended') {
        return { error: { code: 'account_suspended', message: 'Your account is temporarily suspended. Please contact support.' } };
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Supabase signin error:', error);
        if (error.message.match(/invalid.*credential/i)) {
          return { error: { code: 'invalid_credentials', message: 'Incorrect password. Please try again.' } };
        }
        if (error.message.match(/email.*confirm/i)) {
          return { error: { code: 'email_not_confirmed', message: 'Please verify your email address before signing in.' } };
        }
        if (error.message.match(/too many|rate limit/i)) {
          return { error: { code: 'rate_limit', message: 'Too many login attempts. Please wait a few minutes and try again.' } };
        }
        if (error.message.match(/signup_disabled/i)) {
          return { error: { code: 'signup_disabled', message: 'New account registration is currently disabled.' } };
        }
        return { error: { code: 'signin_failed', message: `Sign in failed: ${error.message}` } };
      }

      return { error: null };
    } catch (e) {
      console.error('Unexpected signin error:', e);
      return { error: { code: 'unexpected_error', message: 'An unexpected error occurred. Please try again.' } };
    }
  };

  const signOut = async () => {
    console.log('AuthProvider: signOut() called');

    try {
      // Explicit "global" scope (web + multi-tab safe)
      const { error } = await supabase.auth.signOut({ scope: 'global' } as any);
      if (error && !/not.*signed.*in|invalid.*(refresh|token)/i.test(error.message)) {
        // If it's not just "already signed out", surface it
        console.warn('Supabase signOut returned error (non-fatal):', error);
      }
    } catch (e) {
      console.warn('Supabase signOut threw (non-fatal):', e);
    } finally {
      // 🔥 Hard reset local auth state regardless of event firing
      setSession(null);
      setUser(null);
      setProfile(null);

      // 🔒 Also clear any persisted Supabase tokens on web
      try {
        if (typeof window !== 'undefined' && 'localStorage' in window) {
          for (const k of Object.keys(window.localStorage)) {
            // Supabase stores tokens like sb-<project-ref>-auth-token
            if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
              window.localStorage.removeItem(k);
            }
          }
        }
      } catch (e) {
        console.warn('Could not clear localStorage tokens:', e);
      }

      console.log('AuthProvider: local auth state cleared.');
    }
  };

  const value: AuthContextType = {
    session,
    user,
    profile,
    loading,
    // ✅ Only true when we have a real Supabase session
    isAuthenticated: !!session,
    signUp,
    signIn,
    signOut,
    fetchProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
