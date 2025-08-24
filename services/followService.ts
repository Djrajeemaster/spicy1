import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Deal = Database['public']['Tables']['deals']['Row'];
type Store = Database['public']['Tables']['stores']['Row'];
type User = Database['public']['Tables']['users']['Row'];

export type FollowCounts = {
  followers: number;
  following_users: number;
  following_stores: number;
};

class FollowService {
  /** Follow a user */
  async followUser(targetUserId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };
    const { error } = await supabase
      .from('user_follows')
      .upsert({ follower_id: user.id, followed_id: targetUserId }, { onConflict: 'follower_id,followed_id' });
    return { error };
  }

  /** Unfollow a user */
  async unfollowUser(targetUserId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('followed_id', targetUserId);
    return { error };
  }

  /** Follow a store */
  async followStore(storeId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };
    const { error } = await supabase
      .from('store_follows')
      .upsert({ follower_id: user.id, store_id: storeId }, { onConflict: 'follower_id,store_id' });
    return { error };
  }

  /** Unfollow a store */
  async unfollowStore(storeId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };
    const { error } = await supabase
      .from('store_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('store_id', storeId);
    return { error };
  }

  /** Check if current user follows the given user */
  async isFollowingUser(targetUserId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: false, error: null };
    const { data, error } = await supabase
      .from('user_follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('followed_id', targetUserId)
      .maybeSingle();
    return { data: !!data, error };
  }

  /** Check if current user follows the given store */
  async isFollowingStore(storeId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: false, error: null };
    const { data, error } = await supabase
      .from('store_follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('store_id', storeId)
      .maybeSingle();
    return { data: !!data, error };
  }

  /** Get simple follow counts for a user profile */
  async getCounts(userId: string): Promise<{ data: FollowCounts | null; error: any }> {
    try {
      const [{ count: followers, error: e1 }, { count: following_users, error: e2 }, { count: following_stores, error: e3 }] = await Promise.all([
        supabase.from('user_follows').select('followed_id', { count: 'exact', head: true }).eq('followed_id', userId),
        supabase.from('user_follows').select('follower_id', { count: 'exact', head: true }).eq('follower_id', userId),
        supabase.from('store_follows').select('follower_id', { count: 'exact', head: true }).eq('follower_id', userId),
      ]);
      const error = e1 || e2 || e3;
      if (error) throw error;
      return { data: { followers: followers ?? 0, following_users: following_users ?? 0, following_stores: following_stores ?? 0 }, error: null };
    } catch (error) {
      console.error('getCounts error', error);
      return { data: null, error };
    }
  }

  /** Feed: deals from followed users or followed stores */
  async getFollowingFeed(limit = 20, offset = 0) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: null };

    // Build a PostgREST RPC via SQL to include relations like dealService does
    const sql = `
      with
      my_user_follows as (select followed_id from user_follows where follower_id = '${user.id}'),
      my_store_follows as (select store_id from store_follows where follower_id = '${user.id}')
      select
        d.*,
        s.id as store_id, s.name as store_name, s.slug as store_slug, s.logo_url as store_logo_url, s.verified as store_verified,
        c.id as category_id, c.name as category_name, c.emoji as category_emoji,
        u.id as created_by_id, u.username as created_by_username, u.role as created_by_role, u.reputation as created_by_reputation
      from deals d
        left join stores s on s.id = d.store_id
        left join categories c on c.id = d.category_id
        left join users u on u.id = d.created_by
      where (d.created_by in (select followed_id from my_user_follows))
         or (d.store_id in (select store_id from my_store_follows))
      order by d.created_at desc
      limit ${limit} offset ${offset};
    `;

    const { data, error } = await supabase.rpc('exec_sql', { sql });
    // NOTE: You need a helper SQL function:
    // create or replace function exec_sql(sql text) returns setof record language sql as $$ EXECUTE sql $$;
    // Or replace with a dedicated Postgres view + select.

    return { data, error };
  }
}

export const followService = new FollowService();
