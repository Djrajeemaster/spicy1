import { supabase } from '@/lib/supabase';

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
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .is('read_at', null)
      .order('created_at', { ascending: false });
    return { data: (data || []) as NotificationRow[], error };
  }

  async markRead(ids: string[]) {
    if (!ids.length) return { data: null, error: null };
    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids)
      .select();
    return { data, error };
  }
}

export const notificationService = new NotificationService();
