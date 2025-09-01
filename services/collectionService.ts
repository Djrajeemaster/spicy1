

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
      const response = await fetch(`http://localhost:3000/api/collections?userId=${userId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch collections');
      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async createCollection(userId: string, name: string, description?: string, isPublic = false) {
    try {
      const response = await fetch('http://localhost:3000/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, userId, isPublic }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to create collection');
      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async addDealToCollection(collectionId: string, dealId: string) {
    try {
      const response = await fetch(`http://localhost:3000/api/collections/${collectionId}/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to add deal to collection');
      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async removeDealFromCollection(collectionId: string, dealId: string) {
    try {
      const response = await fetch(`http://localhost:3000/api/collections/${collectionId}/deals/${dealId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to remove deal from collection');
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  async getCollectionDeals(collectionId: string) {
    try {
      const response = await fetch(`http://localhost:3000/api/collections/${collectionId}/deals`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch collection deals');
      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async deleteCollection(collectionId: string, userId: string) {
    try {
      const response = await fetch(`http://localhost:3000/api/collections/${collectionId}?userId=${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete collection');
      return { error: null };
    } catch (error) {
      return { error };
    }
  }
}

export const collectionService = new CollectionService();