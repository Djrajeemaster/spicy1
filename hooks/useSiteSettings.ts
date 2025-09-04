import { useState, useEffect } from 'react';
import { getApiUrl } from '@/utils/config';

interface SiteSettings {
  logoFilename: string | null;
  appName: string;
  tagline: string;
  headerTextColor: string;
  headerGradient: string[] | null;
  animatedLogo: boolean;
}

const defaultSettings: SiteSettings = {
  logoFilename: null,
  appName: 'SaversDream',
  tagline: 'Discover, Share, and Save on the Hottest Deals.',
  headerTextColor: '#fbbf24',
  headerGradient: null,
  animatedLogo: false,
};

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [logoCacheBuster, setLogoCacheBuster] = useState(Date.now());

  const fetchSettings = async () => {
    try {
      const response = await fetch(getApiUrl('/site/settings'));
      if (!response.ok) {
        setSettings(defaultSettings);
        return;
      }
      
      const data = await response.json();
      
      setSettings({
        logoFilename: data.logoFilename || null,
        appName: data.appName || defaultSettings.appName,
        tagline: data.tagline || defaultSettings.tagline,
        headerTextColor: data.headerTextColor || defaultSettings.headerTextColor,
        headerGradient: data.headerGradient || null,
        animatedLogo: data.animatedLogo || false,
      });
      
      if (data.logoFilename) {
        setLogoCacheBuster(Date.now());
      }
    } catch (error) {
      console.error('Error fetching site settings:', error);
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    // Listen for site settings updates
    const handleSettingsUpdate = () => {
      fetchSettings();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('siteSettingsUpdated', handleSettingsUpdate);
      return () => window.removeEventListener('siteSettingsUpdated', handleSettingsUpdate);
    }
  }, []);

  const getLogoUrl = () => {
    if (!settings.logoFilename) return null;
    const baseUrl = getApiUrl('/').replace('/api', ''); // Remove /api for asset URLs
    return `${baseUrl}/${settings.logoFilename}?v=${logoCacheBuster}`;
  };

  return {
    settings,
    loading,
    logoUrl: getLogoUrl(),
    refreshSettings: fetchSettings,
  };
};
