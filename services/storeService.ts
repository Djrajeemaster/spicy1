import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Store = Database['public']['Tables']['stores']['Row'];
type StoreInsert = Database['public']['Tables']['stores']['Insert'];
type StoreUpdate = Database['public']['Tables']['stores']['Update'];

class StoreService {
  async getStores(): Promise<{ data: Store[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name');

      if (error) throw error;

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching stores:', error);
      return { data: [], error };
    }
  }

  async getStoreById(id: string): Promise<{ data: Store | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error fetching store:', error);
      return { data: null, error };
    }
  }

  async getStoreBySlug(slug: string): Promise<{ data: Store | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error fetching store by slug:', error);
      return { data: null, error };
    }
  }

  async createStore(storeData: StoreInsert): Promise<{ data: Store | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('stores')
        .insert(storeData)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error creating store:', error);
      return { data: null, error };
    }
  }

  async updateStore(id: string, updates: StoreUpdate): Promise<{ data: Store | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error updating store:', error);
      return { data: null, error };
    }
  }

  async deleteStore(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Error deleting store:', error);
      return { error };
    }
  }
}

export const storeService = new StoreService();