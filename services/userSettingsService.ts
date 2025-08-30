import { Platform } from 'react-native';

// Types for user settings
export interface NotificationPreferences {
  pushNotifications: boolean;
  emailNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface UserSettings {
  notifications: NotificationPreferences;
  privacy: {
    profileVisible: boolean;
    showEmail: boolean;
    showLocation: boolean;
    allowDirectMessages: boolean;
  };
  app: {
    darkMode: boolean;
    autoRefresh: boolean;
    showTutorials: boolean;
  };
}

class UserSettingsService {
  // Get notification preferences from localStorage/AsyncStorage
  async getNotificationPreferences(): Promise<{ data: NotificationPreferences | null; error: any }> {
    try {
      let settings: NotificationPreferences;
      
      if (Platform.OS === 'web') {
        const stored = localStorage.getItem('spicy_notification_settings');
        settings = stored ? JSON.parse(stored) : {
          pushNotifications: true,
          emailNotifications: false,
          soundEnabled: true,
          vibrationEnabled: true,
        };
      } else {
        // For React Native, we'll use default values for now
        // TODO: Implement AsyncStorage
        settings = {
          pushNotifications: true,
          emailNotifications: false,
          soundEnabled: true,
          vibrationEnabled: true,
        };
      }

      return { data: settings, error: null };
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      return { data: null, error };
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<{ data: NotificationPreferences | null; error: any }> {
    try {
      const { data: currentData } = await this.getNotificationPreferences();
      if (!currentData) {
        throw new Error('Unable to get current settings');
      }
      
      const updatedSettings: NotificationPreferences = { 
        ...currentData, 
        ...preferences 
      };

      if (Platform.OS === 'web') {
        localStorage.setItem('spicy_notification_settings', JSON.stringify(updatedSettings));
      }
      // TODO: Implement AsyncStorage for React Native

      return { data: updatedSettings, error: null };
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return { data: null, error };
    }
  }

  // Get privacy settings from localStorage/AsyncStorage
  async getPrivacySettings(): Promise<{ data: UserSettings['privacy'] | null; error: any }> {
    try {
      let settings: UserSettings['privacy'];
      
      if (Platform.OS === 'web') {
        const stored = localStorage.getItem('spicy_privacy_settings');
        settings = stored ? JSON.parse(stored) : {
          profileVisible: true,
          showEmail: false,
          showLocation: true,
          allowDirectMessages: true,
        };
      } else {
        // For React Native, we'll use default values for now
        // TODO: Implement AsyncStorage
        settings = {
          profileVisible: true,
          showEmail: false,
          showLocation: true,
          allowDirectMessages: true,
        };
      }

      return { data: settings, error: null };
    } catch (error) {
      console.error('Error fetching privacy settings:', error);
      return { data: null, error };
    }
  }

  // Update privacy settings
  async updatePrivacySettings(
    settings: Partial<UserSettings['privacy']>
  ): Promise<{ data: UserSettings['privacy'] | null; error: any }> {
    try {
      const { data: currentData } = await this.getPrivacySettings();
      if (!currentData) {
        throw new Error('Unable to get current privacy settings');
      }
      
      const updatedSettings: UserSettings['privacy'] = { 
        ...currentData, 
        ...settings 
      };

      if (Platform.OS === 'web') {
        localStorage.setItem('spicy_privacy_settings', JSON.stringify(updatedSettings));
      }
      // TODO: Implement AsyncStorage for React Native

      return { data: updatedSettings, error: null };
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      return { data: null, error };
    }
  }

  // Get app preferences from localStorage/AsyncStorage
  async getAppSettings(): Promise<{ data: UserSettings['app'] | null; error: any }> {
    try {
      let settings: UserSettings['app'];
      
      if (Platform.OS === 'web') {
        const stored = localStorage.getItem('spicy_app_settings');
        settings = stored ? JSON.parse(stored) : {
          darkMode: false,
          autoRefresh: true,
          showTutorials: true,
        };
      } else {
        // For React Native, we'll use default values for now
        settings = {
          darkMode: false,
          autoRefresh: true,
          showTutorials: true,
        };
      }

      return { data: settings, error: null };
    } catch (error) {
      console.error('Error fetching app settings:', error);
      return { data: null, error };
    }
  }

  // Update app settings
  async updateAppSettings(
    settings: Partial<UserSettings['app']>
  ): Promise<{ data: UserSettings['app'] | null; error: any }> {
    try {
      const { data: currentData } = await this.getAppSettings();
      if (!currentData) {
        throw new Error('Unable to get current app settings');
      }
      
      const updatedSettings: UserSettings['app'] = { 
        ...currentData, 
        ...settings 
      };

      if (Platform.OS === 'web') {
        localStorage.setItem('spicy_app_settings', JSON.stringify(updatedSettings));
      }
      // TODO: Implement AsyncStorage for React Native

      return { data: updatedSettings, error: null };
    } catch (error) {
      console.error('Error updating app settings:', error);
      return { data: null, error };
    }
  }

  // Get all user settings
  async getAllSettings(): Promise<{ data: UserSettings | null; error: any }> {
    try {
      const [notificationRes, privacyRes, appRes] = await Promise.all([
        this.getNotificationPreferences(),
        this.getPrivacySettings(),
        this.getAppSettings()
      ]);

      if (notificationRes.error || privacyRes.error || appRes.error) {
        const error = notificationRes.error || privacyRes.error || appRes.error;
        throw error;
      }

      return {
        data: {
          notifications: notificationRes.data!,
          privacy: privacyRes.data!,
          app: appRes.data!,
        },
        error: null
      };
    } catch (error) {
      console.error('Error fetching all settings:', error);
      return { data: null, error };
    }
  }
}

export const userSettingsService = new UserSettingsService();
