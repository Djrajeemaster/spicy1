
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
      const response = await fetch('http://localhost:3000/api/users', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching all users:', error);
      return { data: [], error };
    }
  }

  async updateUserStatus(userId: string, status: string, adminId: string): Promise<{ data: any | null; error: any }> {
    try {
      const response = await fetch(`http://localhost:3000/api/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminId }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('Error updating user status:', error);
      return { data: null, error };
    }
  }

  async searchByUsernamePrefix(prefix: string, limit = 8) {
    if (!prefix) return { data: [] as UserProfile[], error: null };
    
    try {
      const response = await fetch(`http://localhost:3000/api/users/search?prefix=${encodeURIComponent(prefix)}&limit=${limit}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return { data: (data || []) as UserProfile[], error: null };
    } catch (error) {
      return { data: [] as UserProfile[], error };
    }
  }

  async getUserByUsername(username: string): Promise<[any, PublicUserProfile | null]> {
    try {
      const response = await fetch(`http://localhost:3000/api/users/username/${encodeURIComponent(username)}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return [null, null];
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const userData = await response.json();
      
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