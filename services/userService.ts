import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type UserProfile = Database['public']['Tables']['users']['Row'];

export interface PublicUserProfile {
  id: string;
  username: string;
  role: string;
  reputation: number;
  avatar_url?: string;
  join_date: string;
  status: string;
}

class UserService {
  async getAllUsers(): Promise<{ data: UserProfile[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching all users:', error);
      return { data: [], error };
    }
  }

  async updateUserStatus(userId: string, status: string, adminId: string): Promise<{ data: any | null; error: any }> {
    try {
      // Using raw SQL to bypass TypeScript issues
      const { data, error } = await supabase.rpc('update_user_status', {
        user_id: userId,
        new_status: status
      });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating user status:', error);
      return { data: null, error };
    }
  }

  async searchByUsernamePrefix(prefix: string, limit = 8) {
    if (!prefix) return { data: [] as UserProfile[], error: null };
    const { data, error } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .ilike('username', `${prefix}%`)
      .order('username', { ascending: true })
      .limit(limit);

    return { data: (data || []) as UserProfile[], error };
  }

  async getUserByUsername(username: string): Promise<[any, PublicUserProfile | null]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role, reputation, avatar_url, created_at, status')
        .eq('username', username)
        .single();
      
      if (error) throw error;
      
      if (!data) return [null, null];
      
      const userData = data as any;
      const publicProfile: PublicUserProfile = {
        id: userData.id,
        username: userData.username,
        role: userData.role || 'user',
        reputation: userData.reputation || 0,
        avatar_url: userData.avatar_url,
        join_date: userData.created_at,
        status: userData.status || 'active'
      };
      
      return [null, publicProfile];
    } catch (error) {
      console.error('Error fetching user by username:', error);
      return [error, null];
    }
  }

  // ... any other existing methods
}

export const userService = new UserService();