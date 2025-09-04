import { apiClient } from '@/utils/apiClient';



export interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemSettingInsert {
  key: string;
  value: any;
  description?: string | null;
}

export interface SystemSettingUpdate {
  value?: any;
  description?: string | null;
  updated_at?: string;
}

class SettingsService {
  async getSettings(): Promise<{ data: SystemSetting[]; error: any }> {
    try {
      const data = await apiClient.get('/settings') as SystemSetting[];
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching settings:', error);
      return { data: [], error };
    }
  }

  async getSetting(key: string): Promise<{ data: SystemSetting | null; error: any }> {
    try {
      const data = await apiClient.get(`/settings/${encodeURIComponent(key)}`) as SystemSetting;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching setting:', error);
      return { data: null, error };
    }
  }

  async updateSetting(key: string, value: any, description?: string | null): Promise<{ data: SystemSetting | null; error: any }> {
    try {
      if (!key || typeof key !== 'string') {
        throw new Error('Invalid key parameter');
      }
      
      const data = await apiClient.put(`/settings/${encodeURIComponent(key)}`, { value, description: description ?? null }) as SystemSetting;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating setting:', error);
      return { data: null, error };
    }
  }

  async createSetting(settingData: SystemSettingInsert): Promise<{ data: SystemSetting | null; error: any }> {
    try {
      const data = await apiClient.post('/settings', settingData) as SystemSetting;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating setting:', error);
      return { data: null, error };
    }
  }
}

export const settingsService = new SettingsService();

// Safer setter with duplicate fallback (use this from UI if possible)
export async function setSetting(key: string, value: any, description?: string | null) {
  const data = await apiClient.put(`/settings/${encodeURIComponent(key)}`, { value, description: description ?? null });
  return data;
}
