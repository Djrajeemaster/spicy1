import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// import types for session and user if needed from your backend response
import { logger } from '@/utils/logger';
import { apiClient } from '@/utils/apiClient';
import { getApiUrl } from '@/utils/config';

export interface AuthContextType {
  session: any | null;
  user: any | null;
  profile: any | null; // Replace 'any' with your UserProfile type
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata: any) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper function to fetch user profile
  const fetchUserProfile = async (userId: string) => {
    try {
      const response = await fetch(getApiUrl(`/users/${userId}`));
      if (!response.ok) {
        // If user profile doesn't exist, just return the basic user data
        return null;
      }
      const data = await response.json();
      return data;
    } catch (err) {
      logger.error('Unexpected error fetching user profile', { userId, error: err });
      return null;
    }
  };

  const normalizeUserRole = (u: any) => {
    if (!u) return u;
    const copy = { ...u };
    if (copy.role === 'super_admin') copy.role = 'superadmin';
    return copy;
  };

  // Top-level fetchSession for reuse
  const fetchSession = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/auth/session'), { 
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const sessionData = await response.json();
        console.log('Session data received:', sessionData);

        if (sessionData.authenticated && sessionData.user) {
          const normalized = normalizeUserRole(sessionData.user);
          setSession(sessionData.session || { user_id: normalized.id });
          setUser(normalized);
          setProfile(normalized);
          console.log('User authenticated:', normalized);
        } else {
          console.log('No authenticated user found');
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } else {
        console.log('Session check failed:', response.status);
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      console.error('Session fetch error:', err);
      setSession(null);
      setUser(null);
      setProfile(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    logger.authEvent('signin_attempt', undefined, { email });
    try {
      const response = await fetch(getApiUrl('/auth/signin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || errorData.message || 'Sign in failed';
        logger.authEvent('signin_failed', undefined, { email, error: errorMessage });
        return { error: new Error(errorMessage) };
      }
      
      const data = await response.json();
      logger.authEvent('signin_success');
      console.log('Signin response data:', data);
      
      // Set the user and session data immediately from signin response
      if (data.authenticated && data.user) {
        const normalized = normalizeUserRole(data.user);
        setSession(data.session || { user_id: normalized.id });
        setUser(normalized);
        setProfile(normalized);
        console.log('User signed in successfully:', normalized);
      } else {
        console.error('Signin response missing user data');
        return { error: new Error('Invalid response from server') };
      }
      
      return { error: null };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.authEvent('signin_failed', undefined, { email, error: errorMsg });
      return { error: new Error(errorMsg) };
    }
  };

  const signUp = async (email: string, password: string, metadata: any): Promise<{ error: Error | null }> => {
    logger.authEvent('signup_attempt', undefined, { email, username: metadata?.username });
    try {
      const response = await fetch(getApiUrl('/auth/signup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username: metadata?.username }),
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || errorData.message || 'Sign up failed';
        logger.authEvent('signup_failed', undefined, { email, error: errorMessage });
        return { error: new Error(errorMessage) };
      }
      logger.authEvent('signup_success');
      await fetchSession();
      return { error: null };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.authEvent('signup_failed', undefined, { email, error: errorMsg });
      return { error: new Error(errorMsg) };
    }
  };

  const signOut = async () => {
    try {
      await fetch(getApiUrl('/auth/signout'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (err) {
      console.error('Signout error:', err);
    } finally {
      // Always clear local state
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  };

  const signInWithGoogle = async () => {
    logger.authEvent('google_signin_attempt_disabled');
    const error = new Error('Google Sign-In is temporarily unavailable. Please use email and password.');
    return { error };
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