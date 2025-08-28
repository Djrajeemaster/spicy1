import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type UserProfile = Database['public']['Tables']['users']['Row'];

export interface UserActionRequest {
  userId: string;
  elevationToken: string;
  reason?: string;
  adminId?: string;
}

export interface BanUserRequest extends UserActionRequest {
  banDuration?: number; // Duration in days, null for permanent
  banReason: string;
}

export interface AdminUserAction {
  id: string;
  user_id: string;
  admin_id: string;
  action_type: 'ban' | 'unban' | 'verify' | 'unverify' | 'suspend' | 'unsuspend' | 'delete' | 'restore' | 'role_change';
  reason?: string;
  duration_days?: number;
  created_at: string;
}

class AdminUserService {
  private async makeAdminRequest(endpoint: string, data: any, elevationToken: string): Promise<any> {
    const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/${endpoint}`;
    const { data: session } = await supabase.auth.getSession();
    const jwt = session.session?.access_token;

    const sanitizedToken = elevationToken.replace(/[\r\n]/g, '');

    console.log('Admin request:', {
      endpoint,
      hasJWT: !!jwt,
      hasElevationToken: !!sanitizedToken,
      tokenLength: sanitizedToken.length,
      userEmail: session.session?.user?.email
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        'x-admin-elevation': sanitizedToken,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Admin request failed:', {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`${endpoint} failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /**
   * Ban a user with optional duration
   */
  async banUser(request: BanUserRequest): Promise<{ success: boolean; message: string }> {
    return this.makeAdminRequest('admin-ban-user', {
      user_id: request.userId,
      reason: request.banReason,
      duration_days: request.banDuration,
      admin_id: request.adminId,
    }, request.elevationToken);
  }

  /**
   * Unban a user
   */
  async unbanUser(request: UserActionRequest): Promise<{ success: boolean; message: string }> {
    return this.makeAdminRequest('admin-unban-user', {
      user_id: request.userId,
      reason: request.reason,
      admin_id: request.adminId,
    }, request.elevationToken);
  }

  /**
   * Verify a user (mark as verified)
   */
  async verifyUser(request: UserActionRequest): Promise<{ success: boolean; message: string }> {
    return this.makeAdminRequest('admin-verify-user', {
      user_id: request.userId,
      reason: request.reason,
      admin_id: request.adminId,
    }, request.elevationToken);
  }

  /**
   * Unverify a user (remove verification)
   */
  async unverifyUser(request: UserActionRequest): Promise<{ success: boolean; message: string }> {
    return this.makeAdminRequest('admin-unverify-user', {
      user_id: request.userId,
      reason: request.reason,
      admin_id: request.adminId,
    }, request.elevationToken);
  }

  /**
   * Suspend a user temporarily
   */
  async suspendUser(request: UserActionRequest & { suspendDays: number }): Promise<{ success: boolean; message: string }> {
    return this.makeAdminRequest('admin-suspend-user', {
      user_id: request.userId,
      reason: request.reason,
      duration_days: request.suspendDays,
      admin_id: request.adminId,
    }, request.elevationToken);
  }

  /**
   * Unsuspend a user
   */
  async unsuspendUser(request: UserActionRequest): Promise<{ success: boolean; message: string }> {
    return this.makeAdminRequest('admin-unsuspend-user', {
      user_id: request.userId,
      reason: request.reason,
      admin_id: request.adminId,
    }, request.elevationToken);
  }

  /**
   * Change a user's role
   */
  async changeUserRole(request: UserActionRequest & { newRole: string }): Promise<{ success: boolean; message: string }> {
    return this.makeAdminRequest('admin-change-role', {
      user_id: request.userId,
      new_role: request.newRole,
      reason: request.reason,
      admin_id: request.adminId,
    }, request.elevationToken);
  }

  /**
   * Delete a user account (soft delete by default)
   */
  async deleteUser(request: UserActionRequest & { hardDelete?: boolean }): Promise<{ success: boolean; message: string }> {
    return this.makeAdminRequest('admin-delete-user', {
      user_id: request.userId,
      reason: request.reason,
      hard_delete: request.hardDelete || false,
      admin_id: request.adminId,
    }, request.elevationToken);
  }

  /**
   * Restore a deleted user account
   */
  async restoreUser(request: UserActionRequest): Promise<{ success: boolean; message: string }> {
    return this.makeAdminRequest('admin-restore-user', {
      user_id: request.userId,
      reason: request.reason,
      admin_id: request.adminId,
    }, request.elevationToken);
  }

  /**
   * Reset user password
   */
  async resetUserPassword(request: UserActionRequest): Promise<{ success: boolean; message: string; tempPassword?: string }> {
    return this.makeAdminRequest('admin-reset-password', {
      user_id: request.userId,
      reason: request.reason,
      admin_id: request.adminId,
    }, request.elevationToken);
  }

  /**
   * Get user action history
   */
  async getUserActionHistory(userId: string): Promise<{ actions: AdminUserAction[] }> {
    try {
      // Try the Edge Function first
      const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-user-history?user_id=${userId}`;
      const { data: session } = await supabase.auth.getSession();
      const jwt = session.session?.access_token;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
      });

      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      console.warn('Edge function not available, falling back to direct queries:', error);
    }

    // Fallback to direct database query if Edge Function fails
    console.log('Using direct database queries for user action history');
    
    try {
      // Try audit_log table first (your existing table)
      const { data: auditActions, error: auditError } = await supabase
        .from('audit_log')
        .select('*')
        .eq('target_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (auditError && auditError.code !== 'PGRST116') {
        // If there's an error other than table not found, try admin_actions
        const { data: adminActions, error: adminActionsError } = await supabase
          .from('admin_actions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (adminActionsError) {
          console.warn('No audit tables available, returning empty actions');
          return { actions: [] };
        }

        return { actions: adminActions || [] };
      }

      return { actions: auditActions || [] };
    } catch (fallbackError: any) {
      console.warn('Failed to fetch user history, returning empty:', fallbackError.message);
      return { actions: [] };
    }
  }

  /**
   * Get user statistics for admin panel
   */
  async getUserStats(userId: string): Promise<{
    user: UserProfile;
    stats: {
      total_deals: number;
      total_comments: number;
      total_votes_given: number;
      total_votes_received: number;
      account_age_days: number;
      last_activity: string;
      is_banned: boolean;
      is_suspended: boolean;
      ban_expiry?: string;
      suspend_expiry?: string;
    };
  }> {
    try {
      // Try the Edge Function first
      const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-user-stats?user_id=${userId}`;
      const { data: session } = await supabase.auth.getSession();
      const jwt = session.session?.access_token;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
      });

      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      console.warn('Edge function not available, falling back to direct queries:', error);
    }

    // Fallback to direct database queries if Edge Function fails
    console.log('Using fallback queries for user stats');
    
    try {
      // Get user data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
      }

      // Get user statistics with parallel queries
      const [dealsResult, commentsResult, votesGivenResult, dealsForVotesResult] = await Promise.allSettled([
        // Total deals created by user
        supabase
          .from('deals')
          .select('id', { count: 'exact' })
          .eq('created_by', userId),
        
        // Total comments by user
        supabase
          .from('comments')
          .select('id', { count: 'exact' })
          .eq('user_id', userId),
        
        // Total votes given by user
        supabase
          .from('votes')
          .select('id', { count: 'exact' })
          .eq('user_id', userId),
        
        // Get deals to calculate votes received
        supabase
          .from('deals')
          .select('votes_up')
          .eq('created_by', userId)
      ]);

      const totalDeals = dealsResult.status === 'fulfilled' ? (dealsResult.value.count || 0) : 0;
      const totalComments = commentsResult.status === 'fulfilled' ? (commentsResult.value.count || 0) : 0;
      const totalVotesGiven = votesGivenResult.status === 'fulfilled' ? (votesGivenResult.value.count || 0) : 0;
      const totalVotesReceived = dealsForVotesResult.status === 'fulfilled' 
        ? (dealsForVotesResult.value.data as any[])?.reduce((sum: number, deal: any) => sum + (deal.votes_up || 0), 0) || 0
        : 0;

      // Calculate account age
      const accountAgeMs = new Date().getTime() - new Date((user as any).created_at).getTime();
      const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));

      // Check ban/suspend status
      const now = new Date().toISOString();
      const userRecord = user as any;
      const isBanned = userRecord.is_banned || userRecord.status === 'banned';
      const isSuspended = userRecord.status === 'suspended';
      const banExpired = userRecord.ban_expiry && userRecord.ban_expiry < now;
      const suspendExpired = userRecord.suspend_expiry && userRecord.suspend_expiry < now;

      return {
        user: user as UserProfile,
        stats: {
          total_deals: totalDeals,
          total_comments: totalComments,
          total_votes_given: totalVotesGiven,
          total_votes_received: totalVotesReceived,
          account_age_days: accountAgeDays,
          last_activity: userRecord.updated_at || userRecord.created_at,
          is_banned: isBanned && !banExpired,
          is_suspended: isSuspended && !suspendExpired,
          ban_expiry: userRecord.ban_expiry,
          suspend_expiry: userRecord.suspend_expiry
        }
      };
    } catch (fallbackError: any) {
      console.error('Direct database query failed:', fallbackError);
      throw new Error(`Failed to fetch user stats: ${fallbackError.message}`);
    }
  }

  /**
   * Bulk actions on multiple users
   */
  async bulkUserAction(request: {
    userIds: string[];
    action: 'ban' | 'unban' | 'verify' | 'unverify' | 'suspend' | 'unsuspend' | 'delete';
    reason: string;
    elevationToken: string;
    adminId?: string;
    duration?: number;
  }): Promise<{ success: boolean; results: Array<{ userId: string; success: boolean; error?: string }> }> {
    return this.makeAdminRequest('admin-bulk-user-action', {
      user_ids: request.userIds,
      action: request.action,
      reason: request.reason,
      admin_id: request.adminId,
      duration_days: request.duration,
    }, request.elevationToken);
  }
}

export const adminUserService = new AdminUserService();
