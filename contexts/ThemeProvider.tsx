import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colors: typeof lightColors;
}

const lightColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  primary: '#6366f1',
  text: '#1e293b',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
};

const darkColors = {
  background: '#0f172a',
  surface: '#1e293b',
  primary: '#6366f1',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  border: '#334155',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        let savedTheme: string | null = null;
        
        if (Platform.OS === 'web') {
          // For web, check localStorage first
          savedTheme = localStorage.getItem('spicy_app_settings');
          if (savedTheme) {
            const appSettings = JSON.parse(savedTheme);
            savedTheme = appSettings.darkMode ? 'dark' : 'light';
          } else {
            // Fallback to direct theme storage
            savedTheme = localStorage.getItem('theme');
          }
        } else {
          // For React Native, use AsyncStorage
          savedTheme = await AsyncStorage.getItem('theme');
        }
        
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setTheme(savedTheme);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      if (Platform.OS === 'web') {
        // Update both direct theme storage and app settings
        localStorage.setItem('theme', newTheme);
        
        // Update the app settings as well
        const appSettings = localStorage.getItem('spicy_app_settings');
        if (appSettings) {
          const settings = JSON.parse(appSettings);
          settings.darkMode = newTheme === 'dark';
          localStorage.setItem('spicy_app_settings', JSON.stringify(settings));
        } else {
          // Create new app settings
          const newSettings = {
            darkMode: newTheme === 'dark',
            autoRefresh: true,
            showTutorials: true,
          };
          localStorage.setItem('spicy_app_settings', JSON.stringify(newSettings));
        }
      } else {
        await AsyncStorage.setItem('theme', newTheme);
      }
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}