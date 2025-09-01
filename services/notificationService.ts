

export interface NotificationRow {
  id: string;
  type: 'mention' | 'reply';
  user_id: string;
  deal_id: string;
  comment_id: string;
  read_at: string | null;
  created_at: string;
}

class NotificationService {
  async listUnread() {
    try {
      const response = await fetch('http://localhost:3000/api/notifications/unread', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      return { data: (data || []) as NotificationRow[], error: null };
    } catch (error) {
      return { data: [] as NotificationRow[], error };
    }
  }

  async markRead(ids: string[]) {
    if (!ids.length) return { data: null, error: null };
    try {
      const response = await fetch('http://localhost:3000/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to mark notifications as read');
      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}

export const notificationService = new NotificationService();
