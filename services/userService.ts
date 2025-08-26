// services/userService.ts
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type User = Database['public']['Tables']['users']['Row'];

class UserService {
  async updateProfile(userId: string, updates: Database['public']['Tables']['users']['Update']) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  }

  async searchByUsernamePrefix(prefix: string, limit = 8) {
    if (!prefix) return { data: [] as User[], error: null };
    const { data, error } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .ilike('username', `${prefix}%`)
      .order('username', { ascending: true })
      .limit(limit);

    return { data: (data || []) as User[], error };
  }

  async getAllUsers(opts?: { search?: string; limit?: number; offset?: number }) {
    const { search, limit = 50, offset = 0 } = opts ?? {};

    let query = supabase
      .from('users')
      .select('id, username, avatar_url, role, reputation, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search && search.trim()) {
      query = query.ilike('username', `%${search.trim()}%`);
    }

    const { data, error, count } = await query;
    return { data: (data || []) as User[], error, count: count ?? null };
  }
}

export const userService = new UserService();
export type { User };
export default userService;
