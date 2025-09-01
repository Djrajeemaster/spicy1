

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
      const response = await fetch('http://localhost:3000/api/announcements', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch announcements');
      return await response.json();
    } catch (error) {
      console.error('Error fetching announcements:', error);
      throw error;
    }
  }

  async sendAnnouncement(request: SendAnnouncementRequest): Promise<void> {
    try {
      const response = await fetch('http://localhost:3000/api/admin/send-announcement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-elevation': request.elevationToken,
        },
        body: JSON.stringify({
          title: request.title,
          content: request.content,
          type: request.type,
          target_audience: request.target_audience,
          send_push: request.send_push,
        }),
        credentials: 'include'
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
      const response = await fetch('http://localhost:3000/api/admin/announcement-stats', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch announcement stats');
      return await response.json();
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
      const response = await fetch('http://localhost:3000/api/admin/system-notifications', {
        credentials: 'include'
      });
      if (!response.ok) return [];
      return await response.json();
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
