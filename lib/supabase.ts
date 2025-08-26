import 'react-native-get-random-values'; // Required for uuid to work in React Native
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '@/types/database';

// Validate required environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing required environment variables. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
  );
}

if (supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder')) {
  throw new Error(
    'Please replace placeholder values in your environment variables with actual Supabase credentials.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper functions for role-based access control
export const canAccessAdmin = (userRole?: string) => {
  return userRole === 'admin' || userRole === 'superadmin';
};

export const canAccessModerator = (userRole?: string) => {
  return userRole === 'moderator' || userRole === 'admin' || userRole === 'superadmin';
};

export const canAccessBusiness = (userRole?: string) => {
  return userRole === 'business' || userRole === 'admin' || userRole === 'superadmin';
};