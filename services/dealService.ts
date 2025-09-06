
import { Database } from '@/types/database';
import { apiClient } from '@/utils/apiClient';
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
      const params = {
        status: 'live',
        sortBy: options.sortBy || 'recent',
        limit: (options.limit || 50).toString()
      };
      
      const data = await apiClient.get<DealWithRelations[]>('/deals', params);
      return data as DealWithRelations[];
    }, 'DealService.getDeals');
  }

  getDealById(dealId: string, userId?: string) {
    return safeAsync(async () => {
      const params = userId ? { userId } : undefined;
      const data = await apiClient.get<DealWithRelations>(`/deals/${dealId}`, params);
      return data as DealWithRelations;
    }, 'DealService.getDealById');
  }

  getUserDeals(userId: string) {
    return safeAsync(async () => {
      const data = await apiClient.get<DealWithRelations[]>('/deals', { user_id: userId });
      return data as DealWithRelations[];
    }, 'DealService.getUserDeals');
  }

  createDeal(dealData: any) {
    return safeAsync(async () => {
      const data = await apiClient.post('/deals', dealData);
      return data;
    }, 'DealService.createDeal');
  }

  updateDeal(dealId: string, dealData: DealUpdate, userId?: string, userRole?: string) {
    return safeAsync(async () => {
      const data = await apiClient.put(`/deals/${dealId}`, { ...dealData, userId, userRole });
      return data;
    }, 'DealService.updateDeal');
  }

  // Admin-specific method to update any deal
  adminUpdateDeal(dealId: string, dealData: DealUpdate, adminUserId: string, adminRole: string) {
    return safeAsync(async () => {
      const data = await apiClient.put(`/deals/${dealId}`, { ...dealData, userId: adminUserId, userRole: adminRole });
      return data;
    }, 'DealService.adminUpdateDeal');
  }

  deleteDeal(dealId: string) {
    return safeAsync(async () => {
      await apiClient.delete(`/deals/${dealId}`);
      return { success: true };
    }, 'DealService.deleteDeal');
  }

  voteDeal(dealId: string, userId: string, voteType: 'up' | 'down') {
    return safeAsync(async () => {
      await apiClient.post(`/deals/${dealId}/vote`, { userId, voteType });
      return { success: true };
    }, 'DealService.voteDeal');
  }

  getPendingDeals() {
    return safeAsync(async () => {
      // Include deals that need admin attention: pending, draft, flagged, reported
      const data = await apiClient.get('/deals?moderation=true');
      return data as DealWithRelations[];
    }, 'DealService.getPendingDeals');
  }

  getSavedDeals(userId: string) {
    return safeAsync(async () => {
      const data = await apiClient.get(`/deals/saved?userId=${userId}`);
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
      
      const data = await apiClient.get(`/deals?${params}`);
      return data as DealWithRelations[];
    }, 'DealService.getRelatedDeals');
  }
}

export const dealService = new DealService();
