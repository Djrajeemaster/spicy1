
import { Database } from '@/types/database';
import { safeAsync } from '@/utils/errorHandler';
import { apiClient } from '@/utils/apiClient';

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
      await apiClient.post('/follows/user', { targetUserId });
      return { success: true };
    }, 'FollowService.followUser');
  }

  /** Unfollow a user */
  unfollowUser(targetUserId: string) {
    return safeAsync(async () => {
      await apiClient.delete(`/follows/user/${targetUserId}`);
      return { success: true };
    }, 'FollowService.unfollowUser');
  }

  /** Follow a store */
  followStore(storeId: string) {
    return safeAsync(async () => {
      await apiClient.post('/follows/store', { storeId });
      return { success: true };
    }, 'FollowService.followStore');
  }

  /** Unfollow a store */
  unfollowStore(storeId: string) {
    return safeAsync(async () => {
      await apiClient.delete(`/follows/store/${storeId}`);
      return { success: true };
    }, 'FollowService.unfollowStore');
  }

  /** Check if current user follows the given user */
  async isFollowingUser(targetUserId: string) {
    return safeAsync(async () => {
      const data = await apiClient.get(`/follows/user/${targetUserId}/check`) as { following: boolean };
      return data.following;
    }, 'FollowService.isFollowingUser');
  }

  /** Check if current user follows the given store */
  async isFollowingStore(storeId: string) {
    return safeAsync(async () => {
      const data = await apiClient.get(`/follows/store/${storeId}/check`) as { following: boolean };
      return data.following;
    }, 'FollowService.isFollowingStore');
  }

  /** Get simple follow counts for a user profile */
  getCounts(userId: string) {
    return safeAsync(async () => {
      const data = await apiClient.get(`/follows/counts/${userId}`) as FollowCounts;
      return data;
    }, 'FollowService.getCounts');
  }

  /** Feed: deals from followed users or followed stores */
  getFollowingFeed(limit = 20, offset = 0) {
    return safeAsync(async () => {
      const data = await apiClient.get(`/follows/feed?limit=${limit}&offset=${offset}`) as Deal[];
      return data;
    }, 'FollowService.getFollowingFeed');
  }
}

export const followService = new FollowService();
