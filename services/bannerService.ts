

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
            const response = await fetch('http://localhost:3000/api/banners');
            if (!response.ok) throw new Error('Failed to fetch banners');
            const data = await response.json();
            return { data: data || [], error: null };
          } catch (error) {
            console.error('Error fetching banners:', error);
            return { data: [], error };
          }
        }

        async createBanner(bannerData: BannerInsert): Promise<{ data: Banner | null; error: any }> {
          try {
            const response = await fetch('http://localhost:3000/api/banners', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(bannerData),
            });
            if (!response.ok) throw new Error('Failed to create banner');
            const data = await response.json();
            return { data, error: null };
          } catch (error) {
            console.error('Error creating banner:', error);
            return { data: null, error };
          }
        }

        async updateBanner(id: string, updates: BannerUpdate): Promise<{ data: Banner | null; error: any }> {
          try {
            const response = await fetch(`http://localhost:3000/api/banners/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates),
            });
            if (!response.ok) throw new Error('Failed to update banner');
            const data = await response.json();
            return { data, error: null };
          } catch (error) {
            console.error('Error updating banner:', error);
            return { data: null, error };
          }
        }

        async deleteBanner(id: string): Promise<{ error: any }> {
          try {
            const response = await fetch(`http://localhost:3000/api/banners/${id}`, {
              method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete banner');
            return { error: null };
          } catch (error) {
            console.error('Error deleting banner:', error);
            return { error };
          }
        }
}

export const bannerService = new BannerService();