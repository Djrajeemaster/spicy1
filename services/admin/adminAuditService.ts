import { apiClient } from '@/utils/apiClient';



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
      const params = new URLSearchParams({
        dateRange: filters.dateRange,
        ...(filters.search && { search: filters.search }),
        ...(filters.action && { action: filters.action }),
        ...(filters.admin_id && { admin_id: filters.admin_id })
      });
      
      const response = await apiClient.get(`/admin/audit-logs?${params}`) as AuditLog[];
      return response;
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
      await apiClient.post('/admin/log-action', {
        adminId, action, description, targetType, targetId, metadata, ipAddress
      });
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
      const params = adminId ? `?admin_id=${adminId}` : '';
      const response = await apiClient.get(`/admin/activity-stats${params}`);
      return response as {
        total_actions: number;
        actions_today: number;
        actions_this_week: number;
        most_common_action: string;
        recent_activity: any[];
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
