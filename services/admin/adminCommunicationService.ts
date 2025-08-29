import { supabase } from '@/lib/supabase';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'urgent';
  target_audience: 'all' | 'verified' | 'business' | 'moderators';
  send_push: boolean;
  created_at: string;
  admin_id: string;
  admin_username?: string;
  views?: number;
  is_published: boolean;
}

interface SendAnnouncementRequest {
  title: string;
  content: string;
  type: 'info' | 'warning' | 'urgent';
  target_audience: 'all' | 'verified' | 'business' | 'moderators';
  send_push: boolean;
  elevationToken: string;
}

class AdminCommunicationService {
  async getAnnouncements(): Promise<Announcement[]> {
    try {
      const { data, error } = await supabase
        .from('admin_announcements')
        .select(`
          id,
          title,
          content,
          type,
          target_audience,
          send_push,
          created_at,
          admin_id,
          views,
          is_published,
          users!admin_announcements_admin_id_fkey(username)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(announcement => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        type: announcement.type as 'info' | 'warning' | 'urgent',
        target_audience: announcement.target_audience as 'all' | 'verified' | 'business' | 'moderators',
        send_push: announcement.send_push,
        created_at: announcement.created_at,
        admin_id: announcement.admin_id,
        admin_username: (announcement as any).users?.username,
        views: announcement.views || 0,
        is_published: announcement.is_published,
      }));
    } catch (error) {
      console.error('Error fetching announcements:', error);
      throw error;
    }
  }

  async sendAnnouncement(request: SendAnnouncementRequest): Promise<void> {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-admin-elevation': request.elevationToken,
      };

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-send-announcement`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: request.title,
          content: request.content,
          type: request.type,
          target_audience: request.target_audience,
          send_push: request.send_push,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send announcement');
      }
    } catch (error) {
      console.error('Error sending announcement:', error);
      throw error;
    }
  }

  async getAnnouncementStats(): Promise<{
    total_announcements: number;
    announcements_this_month: number;
    total_views: number;
    average_views: number;
    by_type: Record<string, number>;
  }> {
    try {
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const { data: announcements, error } = await supabase
        .from('admin_announcements')
        .select('id, type, views, created_at')
        .eq('is_published', true);

      if (error) throw error;

      const thisMonthAnnouncements = announcements?.filter(
        a => new Date(a.created_at) >= thisMonth
      ) || [];

      const totalViews = announcements?.reduce((sum, a) => sum + (a.views || 0), 0) || 0;
      const byType = announcements?.reduce((acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        total_announcements: announcements?.length || 0,
        announcements_this_month: thisMonthAnnouncements.length,
        total_views: totalViews,
        average_views: announcements?.length ? Math.round(totalViews / announcements.length) : 0,
        by_type: byType,
      };
    } catch (error) {
      console.error('Error fetching announcement stats:', error);
      throw error;
    }
  }

  async sendDirectMessage(
    userId: string,
    title: string,
    content: string,
    elevationToken: string
  ): Promise<void> {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-admin-elevation': elevationToken,
      };

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-send-message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: userId,
          title,
          content,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending direct message:', error);
      throw error;
    }
  }

  async getSystemNotifications(): Promise<Array<{
    id: string;
    type: 'maintenance' | 'update' | 'alert';
    title: string;
    message: string;
    scheduled_time?: string;
    is_active: boolean;
    created_at: string;
  }>> {
    try {
      const { data, error } = await supabase
        .from('system_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching system notifications:', error);
      return [];
    }
  }

  async scheduleMaintenanceNotification(
    title: string,
    message: string,
    scheduledTime: Date,
    elevationToken: string
  ): Promise<void> {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-admin-elevation': elevationToken,
      };

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-schedule-maintenance`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          message,
          scheduled_time: scheduledTime.toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to schedule maintenance notification');
      }
    } catch (error) {
      console.error('Error scheduling maintenance notification:', error);
      throw error;
    }
  }

  async getUserEngagementMetrics(): Promise<{
    announcement_open_rate: number;
    notification_click_rate: number;
    user_feedback_count: number;
    most_viewed_announcement: Announcement | null;
  }> {
    try {
      // This would require tracking user interactions with announcements
      // For now, return mock data
      const announcements = await this.getAnnouncements();
      const mostViewed = announcements.sort((a, b) => (b.views || 0) - (a.views || 0))[0] || null;

      return {
        announcement_open_rate: 75.5, // Mock percentage
        notification_click_rate: 32.1, // Mock percentage
        user_feedback_count: 24, // Mock count
        most_viewed_announcement: mostViewed,
      };
    } catch (error) {
      console.error('Error fetching engagement metrics:', error);
      return {
        announcement_open_rate: 0,
        notification_click_rate: 0,
        user_feedback_count: 0,
        most_viewed_announcement: null,
      };
    }
  }

  async bulkSendMessages(
    userIds: string[],
    title: string,
    content: string,
    elevationToken: string
  ): Promise<void> {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-admin-elevation': elevationToken,
      };

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-bulk-message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_ids: userIds,
          title,
          content,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send bulk messages');
      }
    } catch (error) {
      console.error('Error sending bulk messages:', error);
      throw error;
    }
  }
}

export const adminCommunicationService = new AdminCommunicationService();
