

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
      const response = await fetch('http://localhost:3000/api/settings', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching settings:', error);
      return { data: [], error };
    }
  }

  async getSetting(key: string): Promise<{ data: SystemSetting | null; error: any }> {
    try {
      const response = await fetch(`http://localhost:3000/api/settings/${encodeURIComponent(key)}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return { data: null, error: null };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
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
      
      const response = await fetch(`http://localhost:3000/api/settings/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value, description: description ?? null }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('Error updating setting:', error);
      return { data: null, error };
    }
  }

  async createSetting(settingData: SystemSettingInsert): Promise<{ data: SystemSetting | null; error: any }> {
    try {
      const response = await fetch('http://localhost:3000/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingData),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
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
  const response = await fetch(`http://localhost:3000/api/settings/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value, description: description ?? null }),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}
