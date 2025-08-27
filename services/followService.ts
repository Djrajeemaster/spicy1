import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { safeAsync } from '@/utils/errorHandler';

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
  followUser(targetUserId: string) {
    return safeAsync(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      return supabase
        .from('user_follows')
        .upsert({ follower_id: user.id, followed_id: targetUserId }, { onConflict: 'follower_id,followed_id' })
        .throwOnError();
    }, 'FollowService.followUser');
  }

  /** Unfollow a user */
  unfollowUser(targetUserId: string) {
    return safeAsync(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      return supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('followed_id', targetUserId)
        .throwOnError();
    }, 'FollowService.unfollowUser');
  }

  /** Follow a store */
  followStore(storeId: string) {
    return safeAsync(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      return supabase
        .from('store_follows')
        .upsert({ follower_id: user.id, store_id: storeId }, { onConflict: 'follower_id,store_id' })
        .throwOnError();
    }, 'FollowService.followStore');
  }

  /** Unfollow a store */
  unfollowStore(storeId: string) {
    return safeAsync(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      return supabase
        .from('store_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('store_id', storeId)
        .throwOnError();
    }, 'FollowService.unfollowStore');
  }

  /** Check if current user follows the given user */
  async isFollowingUser(targetUserId: string) {
    return safeAsync(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { count, error } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id)
        .eq('followed_id', targetUserId);
      if (error) throw error;
      return (count ?? 0) > 0;
    }, 'FollowService.isFollowingUser');
  }

  /** Check if current user follows the given store */
  async isFollowingStore(storeId: string) {
    return safeAsync(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { count, error } = await supabase
        .from('store_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id)
        .eq('store_id', storeId);
      if (error) throw error;
      return (count ?? 0) > 0;
    }, 'FollowService.isFollowingStore');
  }

  /** Get simple follow counts for a user profile */
  getCounts(userId: string) {
    return safeAsync(async () => {
      const [{ count: followers, error: e1 }, { count: following_users, error: e2 }, { count: following_stores, error: e3 }] = await Promise.all([
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('followed_id', userId),
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        supabase.from('store_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      ]);
      const error = e1 || e2 || e3;
      if (error) throw error;
      return { followers: followers ?? 0, following_users: following_users ?? 0, following_stores: following_stores ?? 0 };
    }, 'FollowService.getCounts');
  }

  /** Feed: deals from followed users or followed stores */
  getFollowingFeed(limit = 20, offset = 0) {
    return safeAsync(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get followed users and stores
      const [{ data: followedUsers }, { data: followedStores }] = await Promise.all([
        supabase.from('user_follows').select('followed_id').eq('follower_id', user.id),
        supabase.from('store_follows').select('store_id').eq('follower_id', user.id)
      ]);

      const userIds = followedUsers?.map(f => f.followed_id);
      const storeIds = followedStores?.map(f => f.store_id);

      if (!userIds?.length && !storeIds?.length) {
        return [];
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
      const orFilters = [];
      if (userIds?.length) {
        orFilters.push(`created_by.in.(${userIds.join(',')})`);
      }
      if (storeIds?.length) {
        orFilters.push(`store_id.in.(${storeIds.join(',')})`);
      }
      if (orFilters.length > 0) {
        query = query.or(orFilters.join(','));
      } else if (userIds?.length) {
        query = query.in('created_by', userIds);
      } else if (storeIds?.length) {
        query = query.in('store_id', storeIds);
      }

      const { data } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
        .throwOnError();

      return data || [];
    }, 'FollowService.getFollowingFeed');
  }
}

export const followService = new FollowService();
