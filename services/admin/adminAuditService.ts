import { supabase } from '@/lib/supabase';

export interface AuditLog {
  id: string;
  admin_id: string;
  admin_username: string;
  action: string;
  description: string;
  target_type?: string;
  target_id?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

interface AuditFilters {
  search?: string;
  action?: string;
  dateRange: 'today' | '7d' | '30d';
  admin_id?: string;
}

class AdminAuditService {
  async getAuditLogs(filters: AuditFilters): Promise<AuditLog[]> {
    try {
      let query = supabase
        .from('admin_actions')
        .select(`
          id,
          admin_id,
          action_type,
          reason,
          user_id,
          created_at,
          ip_address,
          metadata,
          users!admin_actions_admin_id_fkey(username)
        `)
        .order('created_at', { ascending: false });

      // Apply date filter
      const now = new Date();
      if (filters.dateRange === 'today') {
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        query = query.gte('created_at', today.toISOString());
      } else if (filters.dateRange === '7d') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (filters.dateRange === '30d') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', monthAgo.toISOString());
      }

      // Apply action filter
      if (filters.action) {
        query = query.eq('action_type', filters.action);
      }

      // Apply admin filter
      if (filters.admin_id) {
        query = query.eq('admin_id', filters.admin_id);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      // Transform the data to match our AuditLog interface
      const logs: AuditLog[] = (data || []).map(item => ({
        id: item.id,
        admin_id: item.admin_id,
        admin_username: (item as any).users?.username || 'Unknown Admin',
        action: item.action_type,
        description: this.formatActionDescription(item.action_type, item.reason, item.user_id),
        target_type: item.user_id ? 'user' : undefined,
        target_id: item.user_id,
        metadata: item.metadata || {},
        ip_address: item.ip_address,
        created_at: item.created_at,
      }));

      // Apply search filter on transformed data
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return logs.filter(log => 
          log.description.toLowerCase().includes(searchLower) ||
          log.action.toLowerCase().includes(searchLower) ||
          log.admin_username.toLowerCase().includes(searchLower)
        );
      }

      return logs;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  private formatActionDescription(action: string, reason?: string, targetId?: string): string {
    const descriptions: Record<string, string> = {
      'ban': `Banned user ${targetId ? `(${targetId.slice(0, 8)}...)` : ''}`,
      'unban': `Unbanned user ${targetId ? `(${targetId.slice(0, 8)}...)` : ''}`,
      'verify': `Verified user ${targetId ? `(${targetId.slice(0, 8)}...)` : ''}`,
      'unverify': `Unverified user ${targetId ? `(${targetId.slice(0, 8)}...)` : ''}`,
      'suspend': `Suspended user ${targetId ? `(${targetId.slice(0, 8)}...)` : ''}`,
      'unsuspend': `Unsuspended user ${targetId ? `(${targetId.slice(0, 8)}...)` : ''}`,
      'role_change': `Changed user role ${targetId ? `(${targetId.slice(0, 8)}...)` : ''}`,
      'delete': `Deleted user ${targetId ? `(${targetId.slice(0, 8)}...)` : ''}`,
      'approve': 'Approved content',
      'reject': 'Rejected content',
      'elevate': 'Admin elevation requested',
    };

    let description = descriptions[action] || `Performed action: ${action}`;
    
    if (reason) {
      description += ` - Reason: ${reason}`;
    }

    return description;
  }

  async logAdminAction(
    adminId: string,
    action: string,
    description: string,
    targetType?: string,
    targetId?: string,
    metadata?: Record<string, any>,
    ipAddress?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('admin_actions')
        .insert({
          admin_id: adminId,
          action_type: action,
          reason: description,
          user_id: targetType === 'user' ? targetId : null,
          metadata: metadata || {},
          ip_address: ipAddress,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error logging admin action:', error);
      throw error;
    }
  }

  async getAdminActivityStats(adminId?: string): Promise<{
    total_actions: number;
    actions_today: number;
    actions_this_week: number;
    most_common_action: string;
    recent_activity: AuditLog[];
  }> {
    try {
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      let baseQuery = supabase.from('admin_actions');
      if (adminId) {
        baseQuery = baseQuery.select('*').eq('admin_id', adminId);
      } else {
        baseQuery = baseQuery.select('*');
      }

      const [
        { count: totalActions },
        { count: actionsToday },
        { count: actionsThisWeek },
        { data: recentActions }
      ] = await Promise.all([
        baseQuery.select('*', { count: 'exact', head: true }),
        baseQuery.select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
        baseQuery.select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
        baseQuery.select(`
          id,
          admin_id,
          action_type,
          reason,
          user_id,
          created_at,
          users!admin_actions_admin_id_fkey(username)
        `).order('created_at', { ascending: false }).limit(5)
      ]);

      // Find most common action
      const actionCounts = new Map<string, number>();
      recentActions?.forEach(action => {
        const count = actionCounts.get(action.action_type) || 0;
        actionCounts.set(action.action_type, count + 1);
      });

      const mostCommonAction = Array.from(actionCounts.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

      const recentActivity: AuditLog[] = (recentActions || []).map(item => ({
        id: item.id,
        admin_id: item.admin_id,
        admin_username: (item as any).users?.username || 'Unknown Admin',
        action: item.action_type,
        description: this.formatActionDescription(item.action_type, item.reason, item.user_id),
        target_type: item.user_id ? 'user' : undefined,
        target_id: item.user_id,
        created_at: item.created_at,
      }));

      return {
        total_actions: totalActions || 0,
        actions_today: actionsToday || 0,
        actions_this_week: actionsThisWeek || 0,
        most_common_action: mostCommonAction,
        recent_activity: recentActivity,
      };
    } catch (error) {
      console.error('Error fetching admin activity stats:', error);
      return {
        total_actions: 0,
        actions_today: 0,
        actions_this_week: 0,
        most_common_action: 'None',
        recent_activity: [],
      };
    }
  }

  async exportAuditLogs(filters: AuditFilters): Promise<string> {
    try {
      const logs = await this.getAuditLogs(filters);
      
      // Convert to CSV format
      const headers = ['Timestamp', 'Admin', 'Action', 'Description', 'Target', 'IP Address'];
      const csvData = [
        headers.join(','),
        ...logs.map(log => [
          new Date(log.created_at).toISOString(),
          log.admin_username,
          log.action,
          `"${log.description.replace(/"/g, '""')}"`,
          log.target_id || '',
          log.ip_address || ''
        ].join(','))
      ].join('\n');

      return csvData;
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      throw error;
    }
  }
}

export const adminAuditService = new AdminAuditService();
