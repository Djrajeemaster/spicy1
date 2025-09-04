import { apiClient } from '@/utils/apiClient';



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
      const data = await apiClient.get(`/collections?userId=${userId}`);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async createCollection(userId: string, name: string, description?: string, isPublic = false) {
    try {
      const data = await apiClient.post('/collections', { name, description, userId, isPublic });
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async addDealToCollection(collectionId: string, dealId: string) {
    try {
      const data = await apiClient.post(`/collections/${collectionId}/deals`, { dealId });
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async removeDealFromCollection(collectionId: string, dealId: string) {
    try {
      await apiClient.delete(`/collections/${collectionId}/deals/${dealId}`);
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  async getCollectionDeals(collectionId: string) {
    try {
      const data = await apiClient.get(`/collections/${collectionId}/deals`);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async deleteCollection(collectionId: string, userId: string) {
    try {
      await apiClient.delete(`/collections/${collectionId}?userId=${userId}`);
      return { error: null };
    } catch (error) {
      return { error };
    }
  }
}

export const collectionService = new CollectionService();
