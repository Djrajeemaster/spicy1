import 'react-native-get-random-values'; // Required for uuid to work in React Native
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '@/types/database';

// Use placeholder values if environment variables are not set
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

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