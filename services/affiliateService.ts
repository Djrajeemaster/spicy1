
import { Database } from '@/types/database';
import { apiClient } from '@/utils/apiClient';

type AffiliateSettings = Database['public']['Tables']['affiliate_settings']['Row'];
type AffiliateSettingsInsert = Database['public']['Tables']['affiliate_settings']['Insert'];
type AffiliateSettingsUpdate = Database['public']['Tables']['affiliate_settings']['Update'];

export interface AffiliateStats {
  total_stores: number;
  active_affiliates: number;
  total_countries: number;
  stores_by_country: Record<string, number>;
}

class AffiliateService {
  /**
   * Get all affiliate settings with pagination and filtering
   */
  async getAffiliateSettings(filters?: {
    store_name?: string;
    country_code?: string;
    is_active?: boolean;
    search?: string;
  }) {
    try {
      const data = await apiClient.get('/affiliate-settings');
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }


  }

  /**
   * Get affiliate settings for a specific store and country
   */
  async getAffiliateForStore(store_name: string, country_code: string = 'US') {
    return (supabase as any)
      .from('affiliate_settings')
      .select('*')
      .eq('store_name', store_name)
      .eq('country_code', country_code)
      .single();
  }

  /**
   * Create new affiliate settings
   */
  async createAffiliateSettings(settings: AffiliateSettingsInsert) {
    return (supabase as any)
      .from('affiliate_settings')
      .insert(settings)
      .select()
      .single();
  }

  /**
   * Update existing affiliate settings
   */
  async updateAffiliateSettings(id: string, settings: AffiliateSettingsUpdate) {
    return (supabase as any)
      .from('affiliate_settings')
      .update(settings)
      .eq('id', id)
      .select()
      .single();
  }

  /**
   * Delete affiliate settings
   */
  async deleteAffiliateSettings(id: string) {
    return (supabase as any)
      .from('affiliate_settings')
      .delete()
      .eq('id', id);
  }

  /**
   * Toggle active status for affiliate settings
   */
  async toggleAffiliateStatus(id: string, is_active: boolean) {
    return (supabase as any)
      .from('affiliate_settings')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();
  }

  /**
   * Get affiliate statistics
   */
  async getAffiliateStats(): Promise<{ data: AffiliateStats | null; error: any }> {
    try {
      const settings = await apiClient.get('/affiliate-stats');

      const stats: AffiliateStats = {
        total_stores: 0,
        active_affiliates: 0,
        total_countries: 0,
        stores_by_country: {},
      };

      if (Array.isArray(settings)) {
        const uniqueStores = new Set();
        const uniqueCountries = new Set();

        settings.forEach((setting: AffiliateSettings) => {
          uniqueStores.add(setting.store_name);
          uniqueCountries.add(setting.country_code);
          
          if (setting.is_active) {
            stats.active_affiliates++;
          }

          if (!stats.stores_by_country[setting.country_code]) {
            stats.stores_by_country[setting.country_code] = 0;
          }
          stats.stores_by_country[setting.country_code]++;
        });

        stats.total_stores = uniqueStores.size;
        stats.total_countries = uniqueCountries.size;
      }

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Generate affiliate link from original URL
   */
  async generateAffiliateLink(original_url: string, store_name: string, country_code: string = 'US') {
    const { data, error } = await (supabase as any).rpc('generate_affiliate_link', {
      original_url,
      store_name,
      country_code
    });

    return { data, error };
  }

  /**
   * Get list of supported stores
   */
  async getSupportedStores() {
    const { data, error } = await (supabase as any)
      .from('affiliate_settings')
      .select('store_name')
      .order('store_name', { ascending: true });

    if (error) {
      return { data: null, error };
    }

    const uniqueStores = [...new Set(data?.map((item: AffiliateSettings) => item.store_name) || [])];
    return { data: uniqueStores, error: null };
  }

  /**
   * Get list of supported countries for a store
   */
  async getStoreCountries(store_name: string) {
    const { data, error } = await (supabase as any)
      .from('affiliate_settings')
      .select('country_code, is_active')
      .eq('store_name', store_name)
      .order('country_code', { ascending: true });

    return { data, error };
  }

  /**
   * Bulk update multiple affiliate settings
   */
  async bulkUpdateAffiliateSettings(updates: Array<{ id: string; settings: AffiliateSettingsUpdate }>) {
    const promises = updates.map(({ id, settings }) => 
      this.updateAffiliateSettings(id, settings)
    );

    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    return {
      successful,
      failed,
      total: updates.length,
      results
    };
  }

  /**
   * Import affiliate settings from CSV or bulk data
   */
  async importAffiliateSettings(settings: AffiliateSettingsInsert[]) {
    const { data, error } = await (supabase as any)
      .from('affiliate_settings')
      .upsert(settings, { 
        onConflict: 'store_name,country_code',
        ignoreDuplicates: false 
      })
      .select();

    return { data, error };
  }

  /**
   * Export affiliate settings to downloadable format
   */
  async exportAffiliateSettings() {
    const { data, error } = await (supabase as any)
      .from('affiliate_settings')
      .select('*')
      .order('store_name', { ascending: true })
      .order('country_code', { ascending: true });

    if (error) {
      return { data: null, error };
    }

    // Convert to CSV format
    const headers = [
      'Store Name',
      'Country Code', 
      'Affiliate ID',
      'Affiliate Tag',
      'Commission Rate',
      'Tracking Template',
      'Notes',
      'Active',
      'Created At',
      'Updated At'
    ];

    const csvRows = [
      headers.join(','),
      ...(data || []).map((setting: AffiliateSettings) => [
        setting.store_name,
        setting.country_code,
        setting.affiliate_id || '',
        setting.affiliate_tag || '',
        setting.commission_rate || '',
        setting.tracking_template || '',
        setting.notes || '',
        setting.is_active ? 'Yes' : 'No',
        setting.created_at || '',
        setting.updated_at || ''
      ].map(value => `"${value}"`).join(','))
    ];

    const csvContent = csvRows.join('\n');
    
    return { 
      data: csvContent, 
      error: null,
      filename: `affiliate_settings_${new Date().toISOString().split('T')[0]}.csv`
    };
  }
}

export const affiliateService = new AffiliateService();
export type { AffiliateSettings, AffiliateSettingsInsert, AffiliateSettingsUpdate };
