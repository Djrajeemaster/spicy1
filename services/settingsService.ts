import { supabase } from '@/lib/supabase';

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
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('key');

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching settings:', error);
      return { data: [], error };
    }
  }

  async getSetting(key: string): Promise<{ data: SystemSetting | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', key)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching setting:', error);
      return { data: null, error };
    }
  }

  async updateSetting(key: string, value: any): Promise<{ data: SystemSetting | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .upsert({
          key,
          value,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating setting:', error);
      return { data: null, error };
    }
  }

  async createSetting(settingData: SystemSettingInsert): Promise<{ data: SystemSetting | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .insert(settingData)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating setting:', error);
      return { data: null, error };
    }
  }
}

export const settingsService = new SettingsService();