import { supabase } from '@/lib/supabase';

export interface DealCollection {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  is_public: boolean;
  deal_count: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionDeal {
  id: string;
  collection_id: string;
  deal_id: string;
  added_at: string;
  deal?: any; // Deal details
}

class CollectionService {
  async getUserCollections(userId: string) {
    try {
      const { data, error } = await supabase
        .from('deal_collections')
        .select(`
          *,
          collection_deals(count)
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async createCollection(userId: string, name: string, description?: string, isPublic = false) {
    try {
      const { data, error } = await supabase
        .from('deal_collections')
        .insert({
          name,
          description,
          user_id: userId,
          is_public: isPublic,
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async addDealToCollection(collectionId: string, dealId: string) {
    try {
      const { data, error } = await supabase
        .from('collection_deals')
        .insert({
          collection_id: collectionId,
          deal_id: dealId,
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async removeDealFromCollection(collectionId: string, dealId: string) {
    try {
      const { error } = await supabase
        .from('collection_deals')
        .delete()
        .eq('collection_id', collectionId)
        .eq('deal_id', dealId);

      return { error };
    } catch (error) {
      return { error };
    }
  }

  async getCollectionDeals(collectionId: string) {
    try {
      const { data, error } = await supabase
        .from('collection_deals')
        .select(`
          *,
          deals(*)
        `)
        .eq('collection_id', collectionId)
        .order('added_at', { ascending: false });

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async deleteCollection(collectionId: string, userId: string) {
    try {
      const { error } = await supabase
        .from('deal_collections')
        .delete()
        .eq('id', collectionId)
        .eq('user_id', userId);

      return { error };
    } catch (error) {
      return { error };
    }
  }
}

export const collectionService = new CollectionService();