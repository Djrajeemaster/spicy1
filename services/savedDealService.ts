import { supabase } from '@/lib/supabase';
import { safeAsync } from '@/utils/errorHandler';

class SavedDealService {
  async isDealSaved(dealId: string, userId: string) {
    const { data, error } = await supabase
      .from('saved_deals')
      .select('id')
      .eq('deal_id', dealId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking saved status:', error);
      return false;
    }
    return !!data;
  }

  saveDeal(dealId: string, userId: string) {
    return safeAsync(async () => {
      const { error } = await supabase
        .from('saved_deals')
        .insert({ deal_id: dealId, user_id: userId });
      if (error) throw error;
      return { success: true };
    }, 'SavedDealService.saveDeal');
  }

  unsaveDeal(dealId: string, userId: string) {
    return safeAsync(async () => {
      const { error } = await supabase
        .from('saved_deals')
        .delete()
        .eq('deal_id', dealId)
        .eq('user_id', userId);
      if (error) throw error;
      return { success: true };
    }, 'SavedDealService.unsaveDeal');
  }
}

export const savedDealService = new SavedDealService();