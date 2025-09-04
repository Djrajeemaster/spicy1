
import { Database } from '@/types/database';
import { apiClient } from '@/utils/apiClient';

type Store = Database['public']['Tables']['stores']['Row'];
type StoreInsert = Database['public']['Tables']['stores']['Insert'];
type StoreUpdate = Database['public']['Tables']['stores']['Update'];

class StoreService {
  async getStores(): Promise<{ data: Store[]; error: any }> {
    try {
      const data = await apiClient.get<Store[]>('/stores');
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching stores:', error);
      return { data: [], error };
    }
  }

  async getStoreById(id: string): Promise<{ data: Store | null; error: any }> {
    try {
      const data = await apiClient.get<Store>(`/stores/${id}`);
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching store:', error);
      return { data: null, error };
    }
  }

  async getStoreBySlug(slug: string): Promise<{ data: Store | null; error: any }> {
    try {
      const data = await apiClient.get<Store>(`/stores/slug/${slug}`);
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching store by slug:', error);
      return { data: null, error };
    }
  }

  async createStore(storeData: StoreInsert): Promise<{ data: Store | null; error: any }> {
    try {
      const data = await apiClient.post<Store>('/stores', storeData);
      return { data, error: null };
    } catch (error) {
      console.error('Error creating store:', error);
      return { data: null, error };
    }
  }

  async updateStore(id: string, updates: StoreUpdate): Promise<{ data: Store | null; error: any }> {
    try {
      const data = await apiClient.put<Store>(`/stores/${id}`, updates);
      return { data, error: null };
    } catch (error) {
      console.error('Error updating store:', error);
      return { data: null, error };
    }
  }

  async deleteStore(id: string): Promise<{ error: any }> {
    try {
      await apiClient.delete(`/stores/${id}`);
      return { error: null };
    } catch (error) {
      console.error('Error deleting store:', error);
      return { error };
    }
  }
}

export const storeService = new StoreService();
