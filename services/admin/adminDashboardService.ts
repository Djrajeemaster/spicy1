import { supabase } from '@/lib/supabase';

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
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      // Get user stats
      const [
        { count: totalUsers },
        { count: newUsersToday },
        { count: activeUsers }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString()),
        supabase.from('users').select('*', { count: 'exact', head: true })
          .gte('last_seen', yesterday.toISOString())
      ]);

      // Get content stats
      const [
        { count: totalDeals },
        { count: totalComments },
        { count: newDealsToday },
        { count: newCommentsToday }
      ] = await Promise.all([
        supabase.from('deals').select('*', { count: 'exact', head: true }),
        supabase.from('comments').select('*', { count: 'exact', head: true }),
        supabase.from('deals').select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString()),
        supabase.from('comments').select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString())
      ]);

      // Get moderation stats
      const [
        { count: pendingDeals },
        { count: pendingComments },
        { count: pendingReports }
      ] = await Promise.all([
        supabase.from('deals').select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase.from('comments').select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase.from('user_reports').select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
      ]);

      // Get recent activities
      const recentActivities = await this.getRecentActivities();

      // Get system alerts
      const systemAlerts = await this.getSystemAlerts();

      return {
        total_users: totalUsers || 0,
        new_users_today: newUsersToday || 0,
        active_users: activeUsers || 0,
        total_content: (totalDeals || 0) + (totalComments || 0),
        new_content_today: (newDealsToday || 0) + (newCommentsToday || 0),
        pending_moderation: (pendingDeals || 0) + (pendingComments || 0) + (pendingReports || 0),
        recent_activities: recentActivities,
        system_alerts: systemAlerts,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  private async getRecentActivities(): Promise<RecentActivity[]> {
    try {
      const activities: RecentActivity[] = [];

      // Get recent user registrations
      const { data: newUsers } = await supabase
        .from('users')
        .select('id, username, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      newUsers?.forEach(user => {
        activities.push({
          id: `user_${user.id}`,
          type: 'user_registered',
          description: `New user registered: ${user.username || 'Anonymous'}`,
          created_at: user.created_at,
          user_id: user.id,
        });
      });

      // Get recent admin actions
      const { data: adminActions } = await supabase
        .from('admin_actions')
        .select(`
          id,
          action_type,
          reason,
          created_at,
          admin_id,
          user_id,
          users!admin_actions_admin_id_fkey(username)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      adminActions?.forEach(action => {
        activities.push({
          id: action.id,
          type: 'admin_action',
          description: `${(action as any).users?.username || 'Admin'} performed ${action.action_type}`,
          created_at: action.created_at,
          admin_id: action.admin_id,
          user_id: action.user_id,
        });
      });

      // Sort all activities by date
      return activities
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      return [];
    }
  }

  private async getSystemAlerts(): Promise<SystemAlert[]> {
    // Mock system alerts - in a real app, these would come from monitoring systems
    const alerts: SystemAlert[] = [];

    try {
      // Check for high pending moderation count
      const { count: pendingCount } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (pendingCount && pendingCount > 50) {
        alerts.push({
          id: 'high_pending_moderation',
          type: 'warning',
          message: `High pending moderation queue: ${pendingCount} items`,
          created_at: new Date().toISOString(),
        });
      }

      // Check for failed admin actions (mock)
      alerts.push({
        id: 'system_healthy',
        type: 'info',
        message: 'All systems operational',
        created_at: new Date().toISOString(),
      });

      return alerts;
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
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const { count: onlineUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen', fiveMinutesAgo.toISOString());

      const { count: pendingActions } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      return {
        online_users: onlineUsers || 0,
        pending_actions: pendingActions || 0,
        system_load: Math.random() * 100, // Mock data
        error_rate: Math.random() * 5, // Mock data
      };
    } catch (error) {
      console.error('Error fetching quick stats:', error);
      return {
        online_users: 0,
        pending_actions: 0,
        system_load: 0,
        error_rate: 0,
      };
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
      const { data: users } = await supabase
        .from('users')
        .select(`
          id,
          username,
          reputation,
          deals(count),
          comments(count)
        `)
        .order('reputation', { ascending: false })
        .limit(limit);

      return (users || []).map(user => ({
        id: user.id,
        username: user.username || 'Anonymous',
        reputation: user.reputation || 0,
        deal_count: (user as any).deals?.length || 0,
        comment_count: (user as any).comments?.length || 0,
      }));
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
      // Test database connection
      const { error: dbError } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      return {
        database: dbError ? 'down' : 'healthy',
        api: 'healthy', // Would check API endpoints
        storage: 'healthy', // Would check storage service
        cache: 'healthy', // Would check cache service
      };
    } catch (error) {
      console.error('Error checking system health:', error);
      return {
        database: 'down',
        api: 'down',
        storage: 'down',
        cache: 'down',
      };
    }
  }
}

export const adminDashboardService = new AdminDashboardService();
