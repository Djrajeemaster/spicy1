
import { safeAsync } from '@/utils/errorHandler';

class SavedDealService {
  async isDealSaved(dealId: string, userId: string) {
    try {
      const response = await fetch(`http://localhost:3000/api/saved-deals/check?dealId=${dealId}&userId=${userId}`, {
        credentials: 'include'
      });
      if (!response.ok) return false;
      const data = await response.json();
      return data.saved;
    } catch (error) {
      console.error('Error checking saved status:', error);
      return false;
    }
  }

  saveDeal(dealId: string, userId: string) {
    return safeAsync(async () => {
      const response = await fetch('http://localhost:3000/api/saved-deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId, userId }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to save deal');
      return { success: true };
    }, 'SavedDealService.saveDeal');
  }

  unsaveDeal(dealId: string, userId: string) {
    return safeAsync(async () => {
      const response = await fetch(`http://localhost:3000/api/saved-deals?dealId=${dealId}&userId=${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to unsave deal');
      return { success: true };
    }, 'SavedDealService.unsaveDeal');
  }
}

export const savedDealService = new SavedDealService();