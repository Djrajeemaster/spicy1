import { apiClient } from '@/utils/apiClient';



export interface DashboardStats {
  total_users: number;
  new_users_today: number;
  active_users: number;
  total_content: number;
  new_content_today: number;
  pending_moderation: number;
  recent_activities: RecentActivity[];
  system_alerts: SystemAlert[];
}

export interface RecentActivity {
  id: string;
  type: 'user_registered' | 'content_reported' | 'admin_action' | 'content_approved' | 'content_rejected';
  description: string;
  created_at: string;
  admin_id?: string;
  user_id?: string;
}

export interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  created_at: string;
}

class AdminDashboardService {
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response = await apiClient.get('/admin/dashboard-stats');
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      return await response.json();
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  private async getRecentActivities(): Promise<RecentActivity[]> {
    try {
      const response = await apiClient.get('/admin/recent-activities'));
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      return [];
    }
  }

  private async getSystemAlerts(): Promise<SystemAlert[]> {
    try {
      const response = await apiClient.get('/admin/system-alerts'));
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching system alerts:', error);
      return [];
    }
  }

  async getQuickStats(): Promise<{
    online_users: number;
    pending_actions: number;
    system_load: number;
    error_rate: number;
  }> {
    try {
      const response = await apiClient.get('/admin/quick-stats'));
      if (!response.ok) throw new Error('Failed to fetch quick stats');
      return await response.json();
    } catch (error) {
      console.error('Error fetching quick stats:', error);
      return { online_users: 0, pending_actions: 0, system_load: 0, error_rate: 0 };
    }
  }

  async getTopUsers(limit = 10): Promise<Array<{
    id: string;
    username: string;
    reputation: number;
    deal_count: number;
    comment_count: number;
  }>> {
    try {
      const data = await apiClient.get(`/admin/top-users?limit=${limit}`);
      return data as any[];
    } catch (error) {
      console.error('Error fetching top users:', error);
      return [];
    }
  }

  async getSystemHealth(): Promise<{
    database: 'healthy' | 'degraded' | 'down';
    api: 'healthy' | 'degraded' | 'down';
    storage: 'healthy' | 'degraded' | 'down';
    cache: 'healthy' | 'degraded' | 'down';
  }> {
    try {
      const response = await apiClient.get('/admin/system-health'));
      if (!response.ok) throw new Error('Failed to check system health');
      return await response.json();
    } catch (error) {
      console.error('Error checking system health:', error);
      return { database: 'down', api: 'down', storage: 'down', cache: 'down' };
    }
  }
}

export const adminDashboardService = new AdminDashboardService();
