import { apiClient } from '@/utils/apiClient';



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
      const data = await apiClient.get('/notifications/unread') as NotificationRow[];
      return { data: (data || []), error: null };
    } catch (error) {
      return { data: [] as NotificationRow[], error };
    }
  }

  async markRead(ids: string[]) {
    if (!ids.length) return { data: null, error: null };
    try {
      const data = await apiClient.post('/notifications/mark-read', { ids });
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}

export const notificationService = new NotificationService();
