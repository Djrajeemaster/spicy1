
import { Database } from '@/types/database';
import { safeAsync } from '@/utils/errorHandler';

type DealInsert = Database['public']['Tables']['deals']['Insert'];
type DealUpdate = Database['public']['Tables']['deals']['Update'];
export type DealWithRelations = Database['public']['Tables']['deals']['Row'] & {
  store: Database['public']['Tables']['stores']['Row'] | null;
  category: Database['public']['Tables']['categories']['Row'] | null;
  created_by_user: Pick<Database['public']['Tables']['users']['Row'], 'id' | 'username' | 'role' | 'reputation' | 'avatar_url'> | null;
  user_vote?: 'up' | 'down' | null;
};

// Helper function to check if user can edit a deal
export const canEditDeal = (deal: DealWithRelations, userId?: string, userRole?: string): boolean => {
  if (!userId) return false;
  
  // Super admin and admin can edit any deal (support both formats)
  if (userRole === 'super_admin' || userRole === 'superadmin' || userRole === 'admin') return true;
  
  // Regular users can only edit their own deals
  return deal.created_by === userId;
};

class DealService {
  getDeals(options: { sortBy?: string; limit?: number } = {}, userId?: string) {
    return safeAsync(async () => {
      const params = new URLSearchParams({
        status: 'live',
        sortBy: options.sortBy || 'recent',
        limit: (options.limit || 50).toString()
      });
      
      const response = await fetch(`http://localhost:3000/api/deals?${params}`);
      if (!response.ok) throw new Error('Failed to fetch deals');
      const data = await response.json();
      return data as DealWithRelations[];
    }, 'DealService.getDeals');
  }

  getDealById(dealId: string, userId?: string) {
    return safeAsync(async () => {
      const params = userId ? `?userId=${userId}` : '';
      const response = await fetch(`http://localhost:3000/api/deals/${dealId}${params}`);
      if (!response.ok) throw new Error('Deal not found');
      const data = await response.json();
      return data as DealWithRelations;
    }, 'DealService.getDealById');
  }

  getUserDeals(userId: string) {
    return safeAsync(async () => {
      const response = await fetch(`http://localhost:3000/api/deals?user_id=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user deals');
      const data = await response.json();
      return data as DealWithRelations[];
    }, 'DealService.getUserDeals');
  }

  createDeal(dealData: any) {
    return safeAsync(async () => {
      const response = await fetch('http://localhost:3000/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dealData),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to create deal');
      return await response.json();
    }, 'DealService.createDeal');
  }

  updateDeal(dealId: string, dealData: DealUpdate, userId?: string, userRole?: string) {
    return safeAsync(async () => {
      const response = await fetch(`http://localhost:3000/api/deals/${dealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dealData, userId, userRole }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update deal');
      }
      
      return await response.json();
    }, 'DealService.updateDeal');
  }

  // Admin-specific method to update any deal
  adminUpdateDeal(dealId: string, dealData: DealUpdate, adminUserId: string, adminRole: string) {
    return safeAsync(async () => {
      const response = await fetch(`http://localhost:3000/api/deals/${dealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dealData, userId: adminUserId, userRole: adminRole }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to update deal');
      return await response.json();
    }, 'DealService.adminUpdateDeal');
  }

  deleteDeal(dealId: string) {
    return safeAsync(async () => {
      const response = await fetch(`http://localhost:3000/api/deals/${dealId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete deal');
      return { success: true };
    }, 'DealService.deleteDeal');
  }

  voteDeal(dealId: string, userId: string, voteType: 'up' | 'down') {
    return safeAsync(async () => {
      const response = await fetch(`http://localhost:3000/api/deals/${dealId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, voteType }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to vote on deal');
      return { success: true };
    }, 'DealService.voteDeal');
  }

  getPendingDeals() {
    return safeAsync(async () => {
      const response = await fetch('http://localhost:3000/api/deals?status=pending', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch pending deals');
      const data = await response.json();
      return data as DealWithRelations[];
    }, 'DealService.getPendingDeals');
  }

  getSavedDeals(userId: string) {
    return safeAsync(async () => {
      const response = await fetch(`http://localhost:3000/api/deals/saved?userId=${userId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch saved deals');
      const data = await response.json();
      return data as DealWithRelations[];
    }, 'DealService.getSavedDeals');
  }

  getRelatedDeals(dealId: string, categoryId: string, limit = 4) {
    return safeAsync(async () => {
      const params = new URLSearchParams({
        categoryId,
        status: 'live',
        exclude: dealId,
        sortBy: 'popular',
        limit: limit.toString()
      });
      
      const response = await fetch(`http://localhost:3000/api/deals?${params}`);
      if (!response.ok) throw new Error('Failed to fetch related deals');
      const data = await response.json();
      return data as DealWithRelations[];
    }, 'DealService.getRelatedDeals');
  }
}

export const dealService = new DealService();