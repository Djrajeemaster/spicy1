
import { Database } from '@/types/database';

type Store = Database['public']['Tables']['stores']['Row'];
type StoreInsert = Database['public']['Tables']['stores']['Insert'];
type StoreUpdate = Database['public']['Tables']['stores']['Update'];

class StoreService {
  async getStores(): Promise<{ data: Store[]; error: any }> {
    try {
      const response = await fetch('http://localhost:3000/api/stores');
      if (!response.ok) throw new Error('Failed to fetch stores');
      const data = await response.json();
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching stores:', error);
      return { data: [], error };
    }
  }

  async getStoreById(id: string): Promise<{ data: Store | null; error: any }> {
    try {
      const response = await fetch(`http://localhost:3000/api/stores/${id}`);
      if (!response.ok) throw new Error('Failed to fetch store');
      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching store:', error);
      return { data: null, error };
    }
  }

  async getStoreBySlug(slug: string): Promise<{ data: Store | null; error: any }> {
    try {
      const response = await fetch(`http://localhost:3000/api/stores/slug/${slug}`);
      if (!response.ok) throw new Error('Failed to fetch store by slug');
      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching store by slug:', error);
      return { data: null, error };
    }
  }

  async createStore(storeData: StoreInsert): Promise<{ data: Store | null; error: any }> {
    try {
      const response = await fetch('http://localhost:3000/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storeData),
      });
      if (!response.ok) throw new Error('Failed to create store');
      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('Error creating store:', error);
      return { data: null, error };
    }
  }

  async updateStore(id: string, updates: StoreUpdate): Promise<{ data: Store | null; error: any }> {
    try {
      const response = await fetch(`http://localhost:3000/api/stores/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update store');
      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('Error updating store:', error);
      return { data: null, error };
    }
  }

  async deleteStore(id: string): Promise<{ error: any }> {
    try {
      const response = await fetch(`http://localhost:3000/api/stores/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete store');
      return { error: null };
    } catch (error) {
      console.error('Error deleting store:', error);
      return { error };
    }
  }
}

export const storeService = new StoreService();