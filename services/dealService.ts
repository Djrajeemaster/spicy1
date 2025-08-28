import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { safeAsync } from '@/utils/errorHandler';

type DealInsert = Database['public']['Tables']['deals']['Insert'];
export type DealWithRelations = Database['public']['Tables']['deals']['Row'] & {
  store: Database['public']['Tables']['stores']['Row'] | null;
  category: Database['public']['Tables']['categories']['Row'] | null;
  created_by_user: Pick<Database['public']['Tables']['users']['Row'], 'id' | 'username' | 'role' | 'reputation' | 'avatar_url'> | null;
  user_vote?: 'up' | 'down' | null;
};

class DealService {
  getDeals(options: { sortBy?: string; limit?: number } = {}) {
    return safeAsync(async () => {
      let query = supabase.from('deals').select(`
        *,
        store:stores(*),
        category:categories(*),
        created_by_user:users!deals_created_by_fkey(id, username, role, reputation)
      `).eq('status', 'live');

      if (options.sortBy === 'popular') query = query.order('votes_up', { ascending: false });
      else query = query.order('created_at', { ascending: false });

      const { data, error } = await query.limit(options.limit || 50);
      if (error) throw error;
      return data as DealWithRelations[];
    }, 'DealService.getDeals');
  }

  getDealById(dealId: string, userId?: string) {
    return safeAsync(async () => {
      let query = supabase
        .from('deals')
        .select(`
          *,
          store:stores(*),
          category:categories(*),
          created_by_user:users!deals_created_by_fkey(id, username, role, reputation, avatar_url),
          user_vote:votes(vote_type)
        `)
        .eq('id', dealId);

      if (userId) {
        query = query.eq('user_vote.user_id', userId);
      }

      const { data, error } = await query.single();
      if (error) throw error;

      const dealData = data as any;
      if (dealData.user_vote && Array.isArray(dealData.user_vote)) {
        dealData.user_vote = dealData.user_vote.length > 0 ? dealData.user_vote[0].vote_type : null;
      }

      return dealData as DealWithRelations;
    }, 'DealService.getDealById');
  }

  getUserDeals(userId: string) {
    return safeAsync(async () => {
      const { data, error } = await supabase.from('deals').select(`*, store:stores(*), category:categories(*), created_by_user:users!deals_created_by_fkey(id, username, role, reputation)`).eq('created_by', userId).order('created_at', { ascending: false });
      if (error) throw error;
      return data as DealWithRelations[];
    }, 'DealService.getUserDeals');
  }

  createDeal(dealData: DealInsert) {
    return safeAsync(async () => {
      const { data, error } = await supabase.from('deals').insert(dealData).select().single();
      if (error) throw error;
      return data;
    }, 'DealService.createDeal');
  }

  voteDeal(dealId: string, userId: string, voteType: 'up' | 'down') {
    return safeAsync(async () => {
      const { error } = await supabase.rpc('handle_vote', { deal_id_param: dealId, user_id_param: userId, vote_type_param: voteType });
      if (error) throw error;
      return { success: true };
    }, 'DealService.voteDeal');
  }

  getPendingDeals() {
    return safeAsync(async () => {
      const { data, error } = await supabase.from('deals').select(`*, store:stores(*), category:categories(*), created_by_user:users!deals_created_by_fkey(id, username, role, reputation)`).eq('status', 'pending').order('created_at', { ascending: true });
      if (error) throw error;
      return data as DealWithRelations[];
    }, 'DealService.getPendingDeals');
  }

  getSavedDeals(userId: string) {
    return safeAsync(async () => {
      const { data, error } = await supabase.from('saved_deals').select('deal:deals(*, store:stores(*), category:categories(*), created_by_user:users!deals_created_by_fkey(id, username, role, reputation))').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data?.map((item: any) => item.deal) || []) as DealWithRelations[];
    }, 'DealService.getSavedDeals');
  }

  getRelatedDeals(dealId: string, categoryId: string, limit = 4) {
    return safeAsync(async () => {
      const { data, error } = await supabase
        .from('deals')
        .select(`*, store:stores(*), category:categories(*), created_by_user:users!deals_created_by_fkey(id, username, role, reputation)`)
        .eq('category_id', categoryId)
        .eq('status', 'live')
        .neq('id', dealId)
        .order('votes_up', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as DealWithRelations[];
    }, 'DealService.getRelatedDeals');
  }
  // Add this function inside the DealService class
  getDeals(options: { sortBy?: string; limit?: number } = {}, userId?: string) {
    return safeAsync(async () => {
      let query = supabase.from('deals').select(`
        *,
        store:stores(*),
        category:categories(*),
        created_by_user:users!deals_created_by_fkey(id, username, role, reputation)
      `).eq('status', 'live');
  
      if (options.sortBy === 'popular') {
        query = query.order('votes_up', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }
  
      query = query.limit(options.limit || 50);
  
      const { data, error } = await query;
      if (error) throw error;
      return data as DealWithRelations[];
    }, 'DealService.getDeals');
  }
  
}

export const dealService = new DealService();