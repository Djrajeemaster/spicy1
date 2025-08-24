export type UserRole = 'guest' | 'user' | 'verified' | 'business' | 'moderator' | 'admin' | 'superadmin';

export interface User {
  id: string;
  username: string;
  email?: string;
  role: UserRole;
  isVerified: boolean;
  reputation: number;
  joinDate: string;
  totalPosts: number;
  status: 'active' | 'banned' | 'suspended';
  businessInfo?: {
    businessName: string;
    businessType: string;
    verified: boolean;
  };
}

export interface UserPrivileges {
  canPost: boolean;
  canVote: boolean;
  canComment: boolean;
  canModerate: boolean;
  canManageUsers: boolean;
  canManageContent: boolean;
  canAccessAdmin: boolean;
  maxDailyPosts: number;
  autoApprove: boolean;
  canCreateCategories: boolean;
  canManageBanners: boolean;
  canViewAnalytics: boolean;
}

export const getRolePrivileges = (role: UserRole, reputation: number = 0): UserPrivileges => {
  const basePrivileges: UserPrivileges = {
    canPost: false,
    canVote: false,
    canComment: false,
    canModerate: false,
    canManageUsers: false,
    canManageContent: false,
    canAccessAdmin: false,
    maxDailyPosts: 0,
    autoApprove: false,
    canCreateCategories: false,
    canManageBanners: false,
    canViewAnalytics: false,
  };

  switch (role) {
    case 'guest':
      return {
        ...basePrivileges,
        canVote: false,
        canComment: false,
        canPost: false,
      };

    case 'user':
      return {
        ...basePrivileges,
        canPost: reputation >= 2.0,
        canVote: true,
        canComment: true,
        maxDailyPosts: 3,
        autoApprove: false,
      };

    case 'verified':
      return {
        ...basePrivileges,
        canPost: true,
        canVote: true,
        canComment: true,
        maxDailyPosts: 10,
        autoApprove: reputation >= 4.0,
      };

    case 'business':
      return {
        ...basePrivileges,
        canPost: true,
        canVote: true,
        canComment: true,
        maxDailyPosts: 15,
        autoApprove: true,
        canViewAnalytics: true,
      };

    case 'moderator':
      return {
        ...basePrivileges,
        canPost: true,
        canVote: true,
        canComment: true,
        canModerate: true,
        canManageContent: true,
        maxDailyPosts: 25,
        autoApprove: true,
        canViewAnalytics: true,
      };

    case 'admin':
      return {
        ...basePrivileges,
        canPost: true,
        canVote: true,
        canComment: true,
        canModerate: true,
        canManageUsers: true,
        canManageContent: true,
        canAccessAdmin: true,
        canCreateCategories: true,
        canManageBanners: true,
        maxDailyPosts: 50,
        autoApprove: true,
        canViewAnalytics: true,
      };

    case 'superadmin':
      return {
        canPost: true,
        canVote: true,
        canComment: true,
        canModerate: true,
        canManageUsers: true,
        canManageContent: true,
        canAccessAdmin: true,
        canCreateCategories: true,
        canManageBanners: true,
        maxDailyPosts: 999,
        autoApprove: true,
        canViewAnalytics: true,
      };

    default:
      return basePrivileges;
  }
};

export const getRoleDisplayName = (role: UserRole): string => {
  const roleNames = {
    guest: 'Guest',
    user: 'User',
    verified: 'Verified User',
    business: 'Business',
    moderator: 'Moderator',
    admin: 'Admin',
    superadmin: 'Super Admin',
  };
  return roleNames[role] || 'Unknown';
};

export const getRoleColor = (role: UserRole): string => {
  const roleColors = {
    guest: '#94a3b8',
    user: '#6366f1',
    verified: '#10b981',
    business: '#f59e0b',
    moderator: '#8b5cf6',
    admin: '#ef4444',
    superadmin: '#dc2626',
  };
  return roleColors[role] || '#94a3b8';
};