import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type UserProfile = Database['public']['Tables']['users']['Row'];

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

  async updateUserStatus(userId: string, status: string, adminId: string): Promise<{ data: UserProfile | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
      
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

  // ... any other existing methods
}

export const userService = new UserService();