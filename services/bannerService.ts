import { supabase } from '@/lib/supabase';

export interface Banner {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface BannerInsert {
  title: string;
  description: string;
  image_url?: string | null;
  is_active?: boolean;
  priority?: number;
}

export interface BannerUpdate {
  title?: string;
  description?: string;
  image_url?: string | null;
  is_active?: boolean;
  priority?: number;
  updated_at?: string;
}

class BannerService {
  async getBanners(): Promise<{ data: Banner[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('priority', { ascending: true });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching banners:', error);
      return { data: [], error };
    }
  }

  async createBanner(bannerData: BannerInsert): Promise<{ data: Banner | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('banners')
        .insert(bannerData)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating banner:', error);
      return { data: null, error };
    }
  }

  async updateBanner(id: string, updates: BannerUpdate): Promise<{ data: Banner | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('banners')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating banner:', error);
      return { data: null, error };
    }
  }

  async deleteBanner(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error deleting banner:', error);
      return { error };
    }
  }
}

export const bannerService = new BannerService();