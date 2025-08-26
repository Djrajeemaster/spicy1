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

    try {
      // Get followed users and stores
      const [{ data: followedUsers }, { data: followedStores }] = await Promise.all([
        supabase.from('user_follows').select('followed_id').eq('follower_id', user.id),
        supabase.from('store_follows').select('store_id').eq('follower_id', user.id)
      ]);

      const userIds = followedUsers?.map(f => f.followed_id) || [];
      const storeIds = followedStores?.map(f => f.store_id) || [];

      if (userIds.length === 0 && storeIds.length === 0) {
        return { data: [], error: null };
      }

      // Build query for deals from followed users or stores
      let query = supabase
        .from('deals')
        .select(`
          *,
          store:stores(id, name, slug, logo_url, verified),
          category:categories(id, name, emoji),
          created_by_user:users!deals_created_by_fkey(id, username, role, reputation)
        `)
        .eq('status', 'live');

      // Add filters for followed users and stores
      if (userIds.length > 0 && storeIds.length > 0) {
        query = query.or(`created_by.in.(${userIds.join(',')}),store_id.in.(${storeIds.join(',')})`);
      } else if (userIds.length > 0) {
        query = query.in('created_by', userIds);
      } else if (storeIds.length > 0) {
        query = query.in('store_id', storeIds);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      return { data: data || [], error };
    } catch (error) {
      console.error('Error fetching following feed:', error);
      return { data: [], error };
    }
  }
}

export const followService = new FollowService();
