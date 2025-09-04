
import { safeAsync } from '@/utils/errorHandler';
import { apiClient } from '@/utils/apiClient';

class SavedDealService {
  async isDealSaved(dealId: string, userId: string) {
    try {
      const data = await apiClient.get(`/saved-deals/check?dealId=${dealId}&userId=${userId}`) as { saved: boolean };
      return data.saved;
    } catch (error) {
      console.error('Error checking saved status:', error);
      return false;
    }
  }

  saveDeal(dealId: string, userId: string) {
    return safeAsync(async () => {
      await apiClient.post('/saved-deals', { dealId, userId });
      return { success: true };
    }, 'SavedDealService.saveDeal');
  }

  unsaveDeal(dealId: string, userId: string) {
    return safeAsync(async () => {
      await apiClient.delete(`/saved-deals?dealId=${dealId}&userId=${userId}`);
      return { success: true };
    }, 'SavedDealService.unsaveDeal');
  }
}

export const savedDealService = new SavedDealService();
