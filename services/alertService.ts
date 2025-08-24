import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Alert = Database['public']['Tables']['alerts']['Row'];
type AlertInsert = Database['public']['Tables']['alerts']['Insert'];
type AlertUpdate = Database['public']['Tables']['alerts']['Update'];

export interface RecentAlert {
  id: string;
  title: string;
  description: string;
  time: string;
  isRead: boolean;
  category: string;
  created_at: string;
}

class AlertService {
  /**
   * Fetches all active alerts for a specific user.
   * @param userId The ID of the user whose alerts to fetch.
   */
  async getUserAlerts(userId: string): Promise<{ data: Alert[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true); // Only fetch active alerts

      if (error) throw error;

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching user alerts:', error);
      return { data: [], error };
    }
  }

  /**
   * Creates a new alert.
   * @param alertData The data for the new alert.
   */
  async createAlert(alertData: AlertInsert): Promise<{ data: Alert | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .insert(alertData)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error creating alert:', error);
      return { data: null, error };
    }
  }

  /**
   * Updates an existing alert.
   * @param alertId The ID of the alert to update.
   * @param updates The updates to apply to the alert.
   */
  async updateAlert(alertId: string, updates: AlertUpdate): Promise<{ data: Alert | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .update(updates)
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error updating alert:', error);
      return { data: null, error };
    }
  }

  /**
   * Deactivates an alert (soft delete).
   * @param alertId The ID of the alert to deactivate.
   */
  async deactivateAlert(alertId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ is_active: false })
        .eq('id', alertId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Error deactivating alert:', error);
      return { error };
    }
  }

  /**
   * Activates an alert.
   * @param alertId The ID of the alert to activate.
   */
  async activateAlert(alertId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ is_active: true })
        .eq('id', alertId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Error activating alert:', error);
      return { error };
    }
  }

  /**
   * Fetches recent alert notifications for a user.
   * This would typically come from a notifications table or be generated based on user preferences.
   */
  async getRecentAlerts(userId: string): Promise<{ data: RecentAlert[]; error: any }> {
    try {
      // For now, return mock data since we don't have a notifications table
      // In a real implementation, you'd query a notifications/alerts_history table
      const mockAlerts: RecentAlert[] = [
        {
          id: '1',
          title: "New Electronics Deal Near You",
          description: "Gaming laptop 40% off at TechWorld - 3.2 miles away",
          time: "2 hours ago",
          isRead: false,
          category: "electronics",
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          title: "Weekly Deals Digest",
          description: "15 new deals this week in your favorite categories",
          time: "1 day ago",
          isRead: true,
          category: "digest",
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      return { data: mockAlerts, error: null };
    } catch (error) {
      console.error('Error fetching recent alerts:', error);
      return { data: [], error };
    }
  }

  /**
   * Marks an alert as read.
   */
  async markAlertAsRead(alertId: string): Promise<{ error: any }> {
    try {
      // Mock implementation - in reality you'd update a notifications table
      return { error: null };
    } catch (error) {
      console.error('Error marking alert as read:', error);
      return { error };
    }
  }
}

export const alertService = new AlertService();
