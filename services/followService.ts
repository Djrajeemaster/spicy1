
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
      const response = await fetch('http://localhost:3000/api/follows/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to follow user');
      return { success: true };
    }, 'FollowService.followUser');
  }

  /** Unfollow a user */
  unfollowUser(targetUserId: string) {
    return safeAsync(async () => {
      const response = await fetch(`http://localhost:3000/api/follows/user/${targetUserId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to unfollow user');
      return { success: true };
    }, 'FollowService.unfollowUser');
  }

  /** Follow a store */
  followStore(storeId: string) {
    return safeAsync(async () => {
      const response = await fetch('http://localhost:3000/api/follows/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to follow store');
      return { success: true };
    }, 'FollowService.followStore');
  }

  /** Unfollow a store */
  unfollowStore(storeId: string) {
    return safeAsync(async () => {
      const response = await fetch(`http://localhost:3000/api/follows/store/${storeId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to unfollow store');
      return { success: true };
    }, 'FollowService.unfollowStore');
  }

  /** Check if current user follows the given user */
  async isFollowingUser(targetUserId: string) {
    return safeAsync(async () => {
      const response = await fetch(`http://localhost:3000/api/follows/user/${targetUserId}/check`, {
        credentials: 'include'
      });
      if (!response.ok) return false;
      const data = await response.json();
      return data.following;
    }, 'FollowService.isFollowingUser');
  }

  /** Check if current user follows the given store */
  async isFollowingStore(storeId: string) {
    return safeAsync(async () => {
      const response = await fetch(`http://localhost:3000/api/follows/store/${storeId}/check`, {
        credentials: 'include'
      });
      if (!response.ok) return false;
      const data = await response.json();
      return data.following;
    }, 'FollowService.isFollowingStore');
  }

  /** Get simple follow counts for a user profile */
  getCounts(userId: string) {
    return safeAsync(async () => {
      const response = await fetch(`http://localhost:3000/api/follows/counts/${userId}`, {
        credentials: 'include'
      });
      if (!response.ok) return { followers: 0, following_users: 0, following_stores: 0 };
      return await response.json();
    }, 'FollowService.getCounts');
  }

  /** Feed: deals from followed users or followed stores */
  getFollowingFeed(limit = 20, offset = 0) {
    return safeAsync(async () => {
      const response = await fetch(`http://localhost:3000/api/follows/feed?limit=${limit}&offset=${offset}`, {
        credentials: 'include'
      });
      if (!response.ok) return [];
      return await response.json();
    }, 'FollowService.getFollowingFeed');
  }
}

export const followService = new FollowService();
