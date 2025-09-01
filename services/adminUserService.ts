

export interface UserActionRequest {
  userId: string;
  reason: string;
  elevationToken: string;
}

export interface BanUserRequest extends UserActionRequest {
  banReason?: string;
  banDuration?: number; // in days, undefined for permanent
}

export interface SuspendUserRequest extends UserActionRequest {
  suspendDays: number;
}

export interface ChangeRoleRequest extends UserActionRequest {
  newRole: string;
}

export interface DeleteUserRequest extends UserActionRequest {
  hardDelete?: boolean;
}

export interface UserStats {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    is_verified_business: boolean | null;
    join_date: string | null;
    status: string | null;
    reputation: number | null;
    total_posts: number | null;
    avatar_url: string | null;
    location: string | null;
    created_at: string | null;
    updated_at: string | null;
    is_banned: boolean | null;
    ban_expiry: string | null;
    suspend_expiry: string | null;
  };
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
}

class AdminUserService {
  private async makeRequest(endpoint: string, data: any, elevationToken: string) {
    const response = await fetch(`http://localhost:3000/api/admin/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-elevation': elevationToken,
      },
      body: JSON.stringify(data),
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      
      if (response.status === 401) {
        throw new Error('Unauthorized: You may not have admin privileges or your session has expired. Please sign in again.');
      } else if (response.status === 403) {
        throw new Error('Forbidden: You do not have sufficient admin privileges for this action.');
      } else if (response.status === 428) {
        throw new Error('Admin elevation required: Please provide a valid elevation token.');
      } else if (response.status === 440) {
        throw new Error('Elevation token expired: Please request a new elevation token.');
      }
      
      throw new Error(`${endpoint} failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    return response.json();
  }

  async getUserStats(userId: string): Promise<UserStats> {
    const response = await fetch(`http://localhost:3000/api/admin/user-stats?user_id=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Failed to get user stats: ${response.status}`);
    }

    return response.json();
  }

  async banUser(request: BanUserRequest) {
    return this.makeRequest('admin-ban-user', {
      user_id: request.userId,
      reason: request.banReason || request.reason,
      duration_days: request.banDuration,
    }, request.elevationToken);
  }

  async unbanUser(request: UserActionRequest) {
    return this.makeRequest('admin-unban-user', {
      user_id: request.userId,
      reason: request.reason,
    }, request.elevationToken);
  }

  async suspendUser(request: SuspendUserRequest) {
    return this.makeRequest('admin-suspend-user', {
      user_id: request.userId,
      reason: request.reason,
      duration_days: request.suspendDays,
    }, request.elevationToken);
  }

  async unsuspendUser(request: UserActionRequest) {
    return this.makeRequest('admin-unsuspend-user', {
      user_id: request.userId,
      reason: request.reason,
    }, request.elevationToken);
  }

  async changeUserRole(request: ChangeRoleRequest) {
    return this.makeRequest('admin-change-role', {
      user_id: request.userId,
      new_role: request.newRole,
      reason: request.reason,
    }, request.elevationToken);
  }

  async deleteUser(request: DeleteUserRequest) {
    return this.makeRequest('admin-delete-user', {
      user_id: request.userId,
      reason: request.reason,
      hard_delete: request.hardDelete || false,
    }, request.elevationToken);
  }

  async restoreUser(request: UserActionRequest) {
    return this.makeRequest('admin-restore-user', {
      user_id: request.userId,
      reason: request.reason,
    }, request.elevationToken);
  }

  async resetUserPassword(request: UserActionRequest) {
    return this.makeRequest('admin-reset-password', {
      user_id: request.userId,
      reason: request.reason,
    }, request.elevationToken);
  }

  async verifyUser(request: UserActionRequest) {
    return this.makeRequest('admin-verify-user', {
      user_id: request.userId,
      reason: request.reason,
    }, request.elevationToken);
  }

  async unverifyUser(request: UserActionRequest) {
    return this.makeRequest('admin-unverify-user', {
      user_id: request.userId,
      reason: request.reason,
    }, request.elevationToken);
  }

  async bulkUserAction(data: {
    userIds: string[];
    action: string;
    reason: string;
    elevationToken: string;
    duration?: number;
  }) {
    return this.makeRequest('admin-bulk-user-action', {
      user_ids: data.userIds,
      action: data.action,
      reason: data.reason,
      duration: data.duration,
    }, data.elevationToken);
  }
}

export const adminUserService = new AdminUserService();
