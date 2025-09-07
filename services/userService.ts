
import { Database } from '@/types/database';
import { apiClient } from '@/utils/apiClient';

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
      const data = await apiClient.get<UserProfile[]>('/users');
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching all users:', error);
      return { data: [], error };
    }
  }

  async updateUserStatus(userId: string, status: string, adminId: string): Promise<{ data: any | null; error: any }> {
    try {
      const data = await apiClient.put(`/users/${userId}/status`, { status, adminId });
      return { data, error: null };
    } catch (error) {
      console.error('Error updating user status:', error);
      return { data: null, error };
    }
  }

  async searchByUsernamePrefix(prefix: string, limit = 8) {
    if (!prefix) return { data: [] as UserProfile[], error: null };
    
    try {
      const data = await apiClient.get<UserProfile[]>('/users/search', { 
        prefix, 
        limit 
      });
      return { data: (data || []) as UserProfile[], error: null };
    } catch (error) {
      return { data: [] as UserProfile[], error };
    }
  }

  async getUserById(userId: string): Promise<[any, PublicUserProfile | null]> {
    try {
      const userData = await apiClient.get<any>(`/users/${userId}`);
      
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
      if (error instanceof Error && error.message.includes('404')) {
        return [null, null];
      }
      console.error('Error fetching user by ID:', error);
      return [error, null];
    }
  }

  // ... any other existing methods
}

export const userService = new UserService();
