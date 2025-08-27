import { supabase } from '@/lib/supabase';
import { safeAsync } from '@/utils/errorHandler';
import { Database } from '@/types/database';

export type PublicUserProfile = Pick<
  Database['public']['Tables']['users']['Row'],
  'id' | 'username' | 'role' | 'reputation' | 'avatar_url' | 'join_date' | 'is_verified_business'
>;

class UserService {
  getUserByUsername(username: string) {
    return safeAsync(async () => {
      const { data, error } = await supabase.from('users').select('*').eq('username', username).single();
      if (error) throw error;
      return data as PublicUserProfile;
    }, 'UserService.getUserByUsername');
  }

  getUserById(userId: string) {
    return safeAsync(async () => {
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
      if (error) throw error;
      return data as PublicUserProfile;
    }, 'UserService.getUserById');
  }
}

export const userService = new UserService();