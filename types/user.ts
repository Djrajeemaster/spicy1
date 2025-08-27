export type UserRole = 'guest' | 'user' | 'verified' | 'business' | 'moderator' | 'admin' | 'superadmin';

export const getRoleColor = (role: UserRole): string => {
  switch (role) {
    case 'user':
      return '#6366f1'; // Indigo
    case 'verified':
      return '#10b981'; // Green
    case 'business':
      return '#f59e0b'; // Amber
    case 'moderator':
      return '#8b5cf6'; // Violet
    case 'admin':
      return '#ef4444'; // Red
    case 'superadmin':
      return '#dc2626'; // Darker Red
    default:
      return '#1e293b'; // Slate
  }
};

export const getRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case 'user': return 'User';
    case 'verified': return 'Verified';
    case 'business': return 'Business';
    case 'moderator': return 'Moderator';
    case 'admin': return 'Admin';
    case 'superadmin': return 'Super Admin';
    default: return 'Guest';
  }
};

export const getRolePrivileges = (role: UserRole, reputation: number) => {
  const base = {
    canPost: false,
    canVote: false,
    canComment: false,
    canReport: false,
    instantPublish: false,
  };

  if (role === 'guest') return base;

  base.canVote = true;
  base.canComment = true;
  base.canReport = true;

  if (role === 'user' && reputation >= 1.0) base.canPost = true;

  if (['verified', 'business', 'moderator', 'admin', 'superadmin'].includes(role)) {
    base.canPost = true;
    base.instantPublish = true;
  }

  return base;
};