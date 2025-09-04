import { apiClient } from '@/utils/apiClient';



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
            const data = await apiClient.get('/banners') as Banner[];
            return { data: data || [], error: null };
          } catch (error) {
            console.error('Error fetching banners:', error);
            return { data: [], error };
          }
        }

        async createBanner(bannerData: BannerInsert): Promise<{ data: Banner | null; error: any }> {
          try {
            const data = await apiClient.post('/banners', bannerData) as Banner;
            return { data, error: null };
          } catch (error) {
            console.error('Error creating banner:', error);
            return { data: null, error };
          }
        }

        async updateBanner(id: string, updates: BannerUpdate): Promise<{ data: Banner | null; error: any }> {
          try {
            const data = await apiClient.put(`/banners/${id}`, updates) as Banner;
            return { data, error: null };
          } catch (error) {
            console.error('Error updating banner:', error);
            return { data: null, error };
          }
        }

        async deleteBanner(id: string): Promise<{ error: any }> {
          try {
            await apiClient.delete(`/banners/${id}`);
            return { error: null };
          } catch (error) {
            console.error('Error deleting banner:', error);
            return { error };
          }
        }
}

export const bannerService = new BannerService();
