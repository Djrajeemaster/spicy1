// Admin role utilities
export type UserRole = 'user' | 'admin' | 'super_admin' | 'superadmin';

export const isAdmin = (role?: string): boolean => {
  return role === 'admin' || role === 'super_admin' || role === 'superadmin';
};

export const isSuperAdmin = (role?: string): boolean => {
  return role === 'super_admin' || role === 'superadmin';
};

export const canEditAnyDeal = (role?: string): boolean => {
  return isAdmin(role);
};

export const canDeleteAnyDeal = (role?: string): boolean => {
  return isSuperAdmin(role);
};

export const canManageUsers = (role?: string): boolean => {
  return isAdmin(role);
};

export const canAccessAdminPanel = (role?: string): boolean => {
  return isAdmin(role);
};

export const hasElevatedPermissions = (role?: string): boolean => {
  return isAdmin(role);
};

// Get user permissions object
export const getUserPermissions = (role?: string) => {
  return {
    isAdmin: isAdmin(role),
    isSuperAdmin: isSuperAdmin(role),
    canEditAnyDeal: canEditAnyDeal(role),
    canDeleteAnyDeal: canDeleteAnyDeal(role),
    canManageUsers: canManageUsers(role),
    canAccessAdminPanel: canAccessAdminPanel(role),
    hasElevatedPermissions: hasElevatedPermissions(role),
  };
};