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
        .select('id, key, value, description, created_at, updated_at')
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
        .maybeSingle();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching setting:', error);
      return { data: null, error };
    }
  }

  async updateSetting(key: string, value: any, description?: string | null): Promise<{ data: SystemSetting | null; error: any }> {
    try {
      // Validate inputs
      if (!key || typeof key !== 'string') {
        throw new Error('Invalid key parameter');
      }
      
      const timestamp = new Date().toISOString();
      const { data, error } = await supabase
        .from('system_settings')
        .upsert(
          { key, value, description: description ?? null, updated_at: timestamp },
          { onConflict: 'key', ignoreDuplicates: false }
        )
        .select()
        .maybeSingle();

      // Race fallback: if another insert snuck in, update the row
      if (error && (error as any).code === '23505') {
        const res = await supabase
          .from('system_settings')
          .update({ value, description: description ?? null, updated_at: timestamp })
          .eq('key', key)
          .select()
          .maybeSingle();
        return { data: res.data as any, error: res.error as any };
      }

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
        .upsert(settingData, { onConflict: 'key', ignoreDuplicates: false })
        .select()
        .maybeSingle();

      if (error) throw error;
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
  const settingData = { key, value, description: description ?? null };
  let { data, error } = await supabase
    .from('system_settings')
    .upsert(settingData, { onConflict: 'key', ignoreDuplicates: false })
    .select()
    .maybeSingle();

  if (error && (error as any).code === '23505') {
    const res = await supabase
      .from('system_settings')
      .update({ value, description: description ?? null })
      .eq('key', key)
      .select()
      .maybeSingle();
    data = res.data as any;
    error = res.error as any;
  }
  if (error) throw error;
  return data;
}
