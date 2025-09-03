import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TextInput, TouchableOpacity, ScrollView, Alert, Image, Platform } from 'react-native';
import { SystemSettings } from '@/hooks/useAdminData';
import { Settings, Globe, Shield, Users, Clock, Star, DollarSign, Bell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SystemSettingsManagementProps {
  settings: SystemSettings;
  onUpdateSetting: <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => void;
}

export const SystemSettingsManagement: React.FC<SystemSettingsManagementProps> = ({ settings, onUpdateSetting }) => {
  const [tempValues, setTempValues] = useState({
    maxDailyPosts: settings.max_daily_posts_per_user?.toString() || '5',
    minReputationToPost: settings.min_reputation_to_post?.toString() || '0',
    softDeleteRetentionDays: settings.soft_delete_retention_days?.toString() || '30',
    dealExpiryDays: '30',
    maxImageSize: '5',
    rateLimit: '100',
    maintenanceMessage: 'System maintenance in progress...',
    welcomeMessage: 'Welcome to SpicyBeats!',
    maxCommentLength: '500',
    autoDeleteExpired: '7',
  });

  // Branding/site settings (from server-side site-settings.json)
  const [headerColor, setHeaderColor] = useState<string>('#0A2540');
  const [logoFilename, setLogoFilename] = useState<string>('sdicon.PNG');
  const [availableLogos, setAvailableLogos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [useGradient, setUseGradient] = useState<boolean>(false);
  const [headerGradientStart, setHeaderGradientStart] = useState<string>('#6366f1');
  const [headerGradientEnd, setHeaderGradientEnd] = useState<string>('#4f46e5');
  const [animatedLogo, setAnimatedLogo] = useState<boolean>(false);
  // Site font selection (branding)
  // Expanded list of common Google fonts; admins can also load any Google Font by name below.
  const fontOptions = [
    'Inter', 'Poppins', 'Rubik', 'Manrope', 'Montserrat', 'Roboto', 'Open Sans', 'Lato',
    'Nunito', 'Raleway', 'Oswald', 'Merriweather', 'Source Sans 3', 'Work Sans', 'Quicksand'
  ];
  const [siteFont, setSiteFont] = useState<string>(fontOptions[0]);
  const [customFontInput, setCustomFontInput] = useState<string>('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [testLog, setTestLog] = useState<string[]>([]);
  const isDev = typeof __DEV__ !== 'undefined' ? (__DEV__ as boolean) : false;
  // If admin UI is served from a different dev port (e.g. :8081), point API calls to :3000
  const apiBase = (typeof window !== 'undefined' && window.location && window.location.port === '8081') ? 'http://localhost:3000' : '';
  const api = (path: string) => apiBase ? `${apiBase}${path}` : path;
  const assetUrl = (filename: string) => apiBase ? `${apiBase}/${filename}` : `/${filename}`;

  useEffect(() => {
    // load current site settings
    (async () => {
      try {
        const res = await fetch(api('/api/site/settings'), { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.headerTextColor) setHeaderColor(data.headerTextColor);
        if (data.headerGradient && Array.isArray(data.headerGradient) && data.headerGradient.length >= 2) {
          setUseGradient(true);
          setHeaderGradientStart(data.headerGradient[0]);
          setHeaderGradientEnd(data.headerGradient[1]);
        }
        if (typeof data.animatedLogo === 'boolean') setAnimatedLogo(data.animatedLogo);
        if (data.logoFilename) setLogoFilename(data.logoFilename);
  if (data.siteFont) setSiteFont(data.siteFont);
        // also fetch available uploaded logos
        fetchAvailableLogos();
      } catch (err) {
        // ignore silently
      }
    })();
  }, []);

  async function fetchAvailableLogos() {
    if (Platform.OS !== 'web') return; // server listing only used in web admin UI
    try {
      const res = await fetch(api('/api/site/logos'), { credentials: 'include' });
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json)) {
        // prioritize: 1) currently active logoFilename, 2) files starting with 'site-logo', then alphabetical
        const active = typeof logoFilename === 'string' && logoFilename ? logoFilename : null;
        const sorted = [...json].sort((a: string, b: string) => {
          // active first
          if (active) {
            if (a === active && b !== active) return -1;
            if (b === active && a !== active) return 1;
          }
          const aSite = a.toLowerCase().startsWith('site-logo');
          const bSite = b.toLowerCase().startsWith('site-logo');
          if (aSite && !bSite) return -1;
          if (!aSite && bSite) return 1;
          return a.localeCompare(b, undefined, { sensitivity: 'base' });
        });
        setAvailableLogos(sorted);
      }
    } catch (e) {
      console.error('Failed to fetch available logos', e);
    }
  }

  // Web-friendly professional toast and confirm helpers to avoid native browser popups
  const isWeb = Platform.OS === 'web';
  // Load a Google Font dynamically on web and select it for preview.
  async function loadGoogleFont(fontName: string) {
    if (!fontName) return webToast('No font', 'Please enter a font name');
    if (!isWeb || typeof document === 'undefined') {
      webToast('Not supported', 'Dynamic font loading is available on web only');
      return;
    }

    try {
      const idSafe = fontName.replace(/[^a-z0-9\-]/gi, '-');
      const linkId = `spicy-font-${idSafe}`;
      if (document.getElementById(linkId)) {
        // already loaded
        setSiteFont(fontName);
        return;
      }

      // Ensure preconnects exist
      if (!document.getElementById('spicy-fonts-pre1')) {
        const pre1 = document.createElement('link');
        pre1.rel = 'preconnect';
        pre1.href = 'https://fonts.googleapis.com';
        pre1.id = 'spicy-fonts-pre1';
        document.head.appendChild(pre1);
      }
      if (!document.getElementById('spicy-fonts-pre2')) {
        const pre2 = document.createElement('link');
        pre2.rel = 'preconnect';
        pre2.href = 'https://fonts.gstatic.com';
        pre2.crossOrigin = 'anonymous';
        pre2.id = 'spicy-fonts-pre2';
        document.head.appendChild(pre2);
      }

      const family = fontName.trim().replace(/\s+/g, '+');
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;700&display=swap`;
      link.id = linkId;
      document.head.appendChild(link);

      // select immediately; but wait for the font to be available then re-apply so preview updates
      setSiteFont(fontName);
      try {
        // wait for the font to load (this is web-only and may not be supported in older browsers)
        if ((document as any).fonts && (document as any).fonts.load) {
          await (document as any).fonts.load(`1em "${fontName}"`);
          // trigger a small re-render
          setSiteFont(prev => prev + '');
        }
      } catch (e) {
        // ignore font load failures; browser will swap when ready
      }
    } catch (err) {
      console.error('Failed to load font', err);
      webToast('Error', 'Failed to load font from Google Fonts');
    }
  }
  function webToast(title: string, message: string) {
    if (!isWeb || typeof document === 'undefined') return Alert.alert(title, message);

    // Clear any existing toasts created by this component
    Array.from(document.querySelectorAll('[id^="sys-toast-"]')).forEach(n => { try { n.remove(); } catch (e) {} });

    const id = `sys-toast-${Date.now()}-${Math.random()}`;
    const container = document.createElement('div');
    container.id = id;
    container.style.position = 'fixed';
    container.style.right = '20px';
    container.style.top = '20px';
    container.style.zIndex = '99999';
    container.style.minWidth = '260px';
    container.style.maxWidth = '360px';
    container.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
    container.style.borderRadius = '8px';
    container.style.overflow = 'hidden';
    container.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

    const titleEl = document.createElement('div');
    titleEl.style.background = '#111827';
    titleEl.style.color = '#fff';
    titleEl.style.padding = '10px 12px';
    titleEl.style.fontWeight = '700';
    titleEl.textContent = title;

    const bodyEl = document.createElement('div');
    bodyEl.style.padding = '10px 12px';
    bodyEl.style.color = '#0f172a';
    bodyEl.style.background = '#fff';
    bodyEl.textContent = message;

    container.appendChild(titleEl);
    container.appendChild(bodyEl);
    document.body.appendChild(container);
    // Keep it for exactly 2s
    setTimeout(() => { try { document.body.removeChild(container); } catch (e) {} }, 2000);
  }

  function webConfirm(message: string): Promise<boolean> {
    if (!isWeb || typeof document === 'undefined') return Promise.resolve(false);
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.left = '0';
      overlay.style.top = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.background = 'rgba(0,0,0,0.4)';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = '99998';

      const card = document.createElement('div');
      card.style.width = '420px';
      card.style.background = '#fff';
      card.style.borderRadius = '10px';
      card.style.padding = '20px';
      card.style.boxShadow = '0 10px 30px rgba(2,6,23,0.2)';

      const msg = document.createElement('div');
      msg.style.marginBottom = '18px';
      msg.style.color = '#0f172a';
      msg.textContent = message;

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.justifyContent = 'flex-end';
      actions.style.gap = '10px';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.padding = '8px 12px';
      cancelBtn.style.borderRadius = '8px';
      cancelBtn.style.border = '1px solid #e5e7eb';
      cancelBtn.style.background = '#f8fafc';

      const okBtn = document.createElement('button');
      okBtn.textContent = 'Confirm';
      okBtn.style.padding = '8px 12px';
      okBtn.style.borderRadius = '8px';
      okBtn.style.border = 'none';
      okBtn.style.background = '#2563eb';
      okBtn.style.color = '#fff';

      cancelBtn.onclick = () => { try { document.body.removeChild(overlay); } catch (e) {} ; resolve(false); };
      okBtn.onclick = () => { try { document.body.removeChild(overlay); } catch (e) {} ; resolve(true); };

      actions.appendChild(cancelBtn);
      actions.appendChild(okBtn);
      card.appendChild(msg);
      card.appendChild(actions);
      overlay.appendChild(card);
      document.body.appendChild(overlay);
    });
  }

  // Keep tempValues synced when settings change but avoid overwriting while a field is focused
  useEffect(() => {
    setTempValues(prev => ({
      maxDailyPosts: focusedField === 'maxDailyPosts' ? prev.maxDailyPosts : (settings.max_daily_posts_per_user?.toString() || prev.maxDailyPosts),
      minReputationToPost: focusedField === 'minReputationToPost' ? prev.minReputationToPost : (settings.min_reputation_to_post?.toString() || prev.minReputationToPost),
      softDeleteRetentionDays: focusedField === 'softDeleteRetentionDays' ? prev.softDeleteRetentionDays : (settings.soft_delete_retention_days?.toString() || prev.softDeleteRetentionDays),
      dealExpiryDays: focusedField === 'dealExpiryDays' ? prev.dealExpiryDays : prev.dealExpiryDays,
      maxImageSize: focusedField === 'maxImageSize' ? prev.maxImageSize : prev.maxImageSize,
      rateLimit: focusedField === 'rateLimit' ? prev.rateLimit : prev.rateLimit,
      maintenanceMessage: focusedField === 'maintenanceMessage' ? prev.maintenanceMessage : prev.maintenanceMessage,
      welcomeMessage: focusedField === 'welcomeMessage' ? prev.welcomeMessage : prev.welcomeMessage,
      maxCommentLength: focusedField === 'maxCommentLength' ? prev.maxCommentLength : prev.maxCommentLength,
      autoDeleteExpired: focusedField === 'autoDeleteExpired' ? prev.autoDeleteExpired : prev.autoDeleteExpired,
    }));
  }, [settings, focusedField]);

  const triggerLogoUpload = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Upload not supported', 'Logo upload from the admin UI is only supported on web. You can replace the file in the server assets folder instead.');
      return;
    }

    try {
      // Let the user pick a file and preview it before confirming upload
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,.gif,.webp';
      input.onchange = () => {
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          webToast('File too large', 'Please select an image smaller than 5MB');
          return;
        }
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          webToast('Invalid file type', 'Please select a valid image file');
          return;
        }
        
        const url = URL.createObjectURL(file);
        setLogoPreviewUrl(url);
        setSelectedLogoFile(file);
        // leave it to the user to confirm the upload (Confirm / Cancel UI shown in Branding card)
      };
      input.click();
    } catch (error) {
      console.error('Error triggering logo upload:', error);
      webToast('Upload Error', 'Failed to open file picker');
    }
  };

  const cancelLogoPreview = () => {
    if (logoPreviewUrl) {
      try { URL.revokeObjectURL(logoPreviewUrl); } catch (e) {}
    }
    setLogoPreviewUrl(null);
    setSelectedLogoFile(null);
  };

  const confirmAndUploadLogo = async () => {
    if (!selectedLogoFile) return;
    // Ask for confirmation (web custom confirm)
    const confirmed = await (isWeb ? webConfirm('Upload selected logo?') : Promise.resolve(true));
    if (!confirmed) return cancelLogoPreview();

    const form = new FormData();
    form.append('logo', selectedLogoFile, selectedLogoFile.name);
    try {
      setUploading(true);
      console.log('Uploading logo:', selectedLogoFile.name, 'Size:', selectedLogoFile.size);
      
      const res = await fetch(api('/api/site/logo'), {
        method: 'POST',
        body: form,
        credentials: 'include'
      });
      
      let json: any = null;
      let textBody: string | null = null;
      try {
        const responseText = await res.text();
        textBody = responseText;
        if (responseText.trim().startsWith('{')) {
          json = JSON.parse(responseText);
        }
      } catch (err) {
        console.error('Error parsing response:', err);
      }

      console.log('Upload response:', res.status, json || textBody);

      if (!res.ok) {
        const msg = (json && (json.error || JSON.stringify(json))) || textBody || `${res.status} ${res.statusText}`;
        console.error('Upload failed:', msg);
        webToast('Upload failed', msg);
      } else {
        webToast('Uploaded', 'Logo uploaded successfully');
        // After upload, fetch authoritative site settings from server (ensures server-assigned filename)
        try {
          const sres = await fetch(api('/api/site/settings'), { credentials: 'include' });
          if (sres.ok) {
            const sjson = await sres.json();
            console.log('Updated site settings:', sjson);
            if (sjson.logoFilename) setLogoFilename(sjson.logoFilename);
            if (typeof sjson.animatedLogo === 'boolean') setAnimatedLogo(sjson.animatedLogo);
            if (sjson.headerGradient && Array.isArray(sjson.headerGradient) && sjson.headerGradient.length >= 2) {
              setHeaderGradientStart(sjson.headerGradient[0]);
              setHeaderGradientEnd(sjson.headerGradient[1]);
              setUseGradient(true);
            } else if (sjson.headerTextColor) {
              setHeaderColor(sjson.headerTextColor);
              setUseGradient(false);
            }
            // persist current animatedLogo / color selection as well
            await saveBranding(true);

            // broadcast the authoritative settings
            try {
              if (typeof window !== 'undefined' && (window as any).dispatchEvent) {
                window.dispatchEvent(new CustomEvent('siteSettingsUpdated', { detail: sjson }));
              }
            } catch (e) { console.error('Error broadcasting settings:', e); }
          }
        } catch (e) { console.error('Error fetching updated settings:', e); }
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      webToast('Upload error', err?.message || String(err));
    } finally {
      setUploading(false);
      cancelLogoPreview();
    }
  };

  async function saveBranding(skipToast?: boolean) {
    try {
      const payload: any = { animatedLogo };
      if (useGradient) {
        payload.headerGradient = [headerGradientStart, headerGradientEnd];
        payload.headerTextColor = null; // Clear single color when using gradient
      } else {
        payload.headerTextColor = headerColor;
        payload.headerGradient = null; // Clear gradient when using single color
      }

  // include selected site font
  if (siteFont) payload.siteFont = siteFont;

      console.log('Saving branding settings:', payload);

      const res = await fetch(api('/api/site/settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      let json: any = null;
      let textBody: string | null = null;
      try {
        const responseText = await res.text();
        textBody = responseText;
        if (responseText.trim().startsWith('{')) {
          json = JSON.parse(responseText);
        }
      } catch (err) {
        console.error('Error parsing branding response:', err);
      }

      console.log('Branding save response:', res.status, json || textBody);

      if (!res.ok) {
        const msg = (json && (json.error || JSON.stringify(json))) || textBody || `${res.status} ${res.statusText}`;
        console.error('Branding save failed:', msg);
        if (!skipToast) webToast('Save failed', msg);
      } else {
        if (!skipToast) webToast('Saved', 'Branding settings updated');
        // fetch authoritative settings and broadcast them so header updates
        try {
          const sres = await fetch(api('/api/site/settings'), { credentials: 'include' });
          if (sres.ok) {
            const sjson = await sres.json();
            console.log('Broadcasting updated settings:', sjson);
            try {
              if (typeof window !== 'undefined' && (window as any).dispatchEvent) {
                window.dispatchEvent(new CustomEvent('siteSettingsUpdated', { detail: sjson }));
              }
            } catch (e) { console.error('Error broadcasting settings:', e); }
          }
        } catch (e) { console.error('Error fetching updated settings:', e); }
      }
    } catch (err: any) {
      console.error('Branding save error:', err);
      if (!skipToast) webToast('Error', err?.message || String(err));
    }
  }

  const updateNumericSetting = (key: keyof typeof tempValues, settingKey: keyof SystemSettings) => {
    const value = parseFloat(tempValues[key]);
    if (!isNaN(value)) {
      onUpdateSetting(settingKey, value);
    }
  };

  const SettingCard = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <View style={settingsStyles.settingCard}>
      <View style={settingsStyles.cardHeader}>
        {icon}
        <Text style={settingsStyles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );

  const ToggleSetting = ({ title, description, value, onToggle }: { title: string; description: string; value: boolean; onToggle: (value: boolean) => void }) => (
    <View style={settingsStyles.settingItem}>
      <View style={settingsStyles.settingTextContainer}>
        <Text style={settingsStyles.settingName}>{title}</Text>
        <Text style={settingsStyles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#E5E7EB', true: '#10b981' }}
        thumbColor={value ? '#FFFFFF' : '#F3F4F6'}
      />
    </View>
  );

  const NumberSetting = ({ title, description, value, onChangeText, onSave, placeholder, fieldKey }: { title: string; description: string; value: string; onChangeText: (text: string) => void; onSave: () => void; placeholder?: string; fieldKey?: string }) => (
    <View style={settingsStyles.settingItem}>
      <View style={settingsStyles.settingTextContainer}>
        <Text style={settingsStyles.settingName}>{title}</Text>
        <Text style={settingsStyles.settingDescription}>{description}</Text>
        <View style={settingsStyles.inputContainer}>
          <TextInput
            style={settingsStyles.numberInput}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => fieldKey && setFocusedField(fieldKey)}
            onBlur={() => setFocusedField(null)}
            keyboardType="numeric"
            placeholder={placeholder}
            placeholderTextColor="#94a3b8"
            onTouchStart={() => fieldKey && setFocusedField(fieldKey)}
          />
          <TouchableOpacity style={settingsStyles.saveButton} onPress={onSave}>
            <Text style={settingsStyles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Helper to update a boolean setting and show a short toast
  async function toggleAndNotify<K extends keyof SystemSettings>(key: K, title: string, value: any) {
    try {
      // call updateSetting with notify=false to avoid duplicate generic toasts
      await (onUpdateSetting as any)(key, value as SystemSettings[K], false);
      webToast(title, `${title} ${value ? 'turned on' : 'turned off'}`);
    } catch (e) {
      webToast('Error', 'Failed to update setting');
    }
  }

  return (
    <ScrollView style={settingsStyles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
      <View style={settingsStyles.header}>
        <LinearGradient colors={['#6366f1', '#4f46e5']} style={settingsStyles.headerGradient}>
          <Settings size={24} color="#FFFFFF" />
          <Text style={settingsStyles.headerTitle}>System Settings</Text>
        </LinearGradient>
      </View>

      {/* Branding card for superadmin: logo upload + header text color */}
      <View style={settingsStyles.settingCard}>
        <View style={settingsStyles.cardHeader}>
          <Settings size={20} color="#06b6d4" />
          <Text style={settingsStyles.cardTitle}>Branding</Text>
        </View>
        <View style={settingsStyles.settingItem}>
          <Text style={settingsStyles.settingName}>Site Logo</Text>
          <Text style={settingsStyles.settingDescription}>Upload a new header icon (web only upload). The file will be stored in the server assets folder.</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <View style={{ width: 96, height: 96, borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
              {/* show preview if selected, otherwise current logo (served from /assets) */}
              {logoPreviewUrl ? (
                // use native Image for cross-platform; on web it will display animated gifs as well
                <Image source={{ uri: logoPreviewUrl }} style={{ width: 88, height: 88 }} />
              ) : (
                <Image source={{ uri: assetUrl(logoFilename) }} style={{ width: 64, height: 64 }} />
              )}
            </View>

            <View style={{ flexDirection: 'column' }}>
              {logoPreviewUrl ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[settingsStyles.saveButton, { backgroundColor: '#059669' }]} onPress={confirmAndUploadLogo} disabled={uploading}>
                    <Text style={settingsStyles.saveButtonText}>{uploading ? 'Uploading...' : 'Confirm Upload'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[settingsStyles.saveButton, { backgroundColor: '#ef4444', marginLeft: 8 }]} onPress={cancelLogoPreview} disabled={uploading}>
                    <Text style={settingsStyles.saveButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={settingsStyles.saveButton} onPress={triggerLogoUpload} disabled={uploading}>
                  <Text style={settingsStyles.saveButtonText}>{uploading ? 'Uploading...' : 'Upload Logo'}</Text>
                </TouchableOpacity>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <Switch value={animatedLogo} onValueChange={setAnimatedLogo} />
                <Text style={[settingsStyles.settingDescription, { marginLeft: 8 }]}>Animated logo (GIF/WebP)</Text>
              </View>
            </View>
          </View>
        </View>

        

        <View style={settingsStyles.settingItem}>
          <Text style={settingsStyles.settingName}>Header Text Color</Text>
          <Text style={settingsStyles.settingDescription}>Pick the color or a gradient used for the header text (SaversDream). You can enable a two-color gradient instead of a single color.</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <Switch value={useGradient} onValueChange={setUseGradient} />
            <Text style={[settingsStyles.settingDescription, { marginLeft: 8 }]}>{useGradient ? 'Using gradient' : 'Using single color'}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            {!useGradient ? (
              // single color picker
              <>
                <TouchableOpacity style={[settingsStyles.numberInput, { width: 140, paddingVertical: 8, justifyContent: 'center' }]} onPress={async () => {
                  if (Platform.OS === 'web' && typeof document !== 'undefined') {
                    try {
                      // native color picker on web
                      const input = document.createElement('input');
                      input.type = 'color';
                      input.value = headerColor || '#0A2540';
                      input.onchange = () => {
                        console.log('Color changed to:', input.value);
                        setHeaderColor(input.value);
                      };
                      input.click();
                    } catch (error) {
                      console.error('Error opening color picker:', error);
                      const val = prompt('Enter hex color (e.g. #ff00aa):', headerColor);
                      if (val && /^#[0-9A-F]{6}$/i.test(val)) setHeaderColor(val);
                    }
                  } else {
                    const val = prompt('Enter hex color (e.g. #ff00aa):', headerColor);
                    if (val && /^#[0-9A-F]{6}$/i.test(val)) {
                      setHeaderColor(val);
                    } else if (val) {
                      webToast('Invalid Color', 'Please enter a valid hex color (e.g. #ff0000)');
                    }
                  }
                }}>
                  <Text style={{ color: '#0f172a' }}>{headerColor}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[settingsStyles.saveButton, { marginLeft: 12 }]} onPress={() => saveBranding()}>
                  <Text style={settingsStyles.saveButtonText}>Save Color</Text>
                </TouchableOpacity>
                <View style={{ width: 28, height: 28, backgroundColor: headerColor, marginLeft: 12, borderRadius: 4, borderWidth: 1, borderColor: '#e2e8f0' }} />
              </>
            ) : (
              // gradient pickers
              <>
                <TouchableOpacity style={[settingsStyles.numberInput, { width: 120, paddingVertical: 8, justifyContent: 'center' }]} onPress={() => {
                  if (Platform.OS === 'web') {
                    const input = document.createElement('input');
                    input.type = 'color';
                    input.value = headerGradientStart;
                    input.onchange = () => setHeaderGradientStart(input.value);
                    input.click();
                  } else {
                    const val = prompt('Enter start hex color:', headerGradientStart);
                    if (val && /^#[0-9A-F]{6}$/i.test(val)) {
                      setHeaderGradientStart(val);
                    } else if (val) {
                      webToast('Invalid Color', 'Please enter a valid hex color');
                    }
                  }
                }}>
                  <Text style={{ color: '#0f172a' }}>{headerGradientStart}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[settingsStyles.numberInput, { width: 120, paddingVertical: 8, justifyContent: 'center', marginLeft: 8 }]} onPress={() => {
                  if (Platform.OS === 'web') {
                    const input = document.createElement('input');
                    input.type = 'color';
                    input.value = headerGradientEnd;
                    input.onchange = () => setHeaderGradientEnd(input.value);
                    input.click();
                  } else {
                    const val = prompt('Enter end hex color:', headerGradientEnd);
                    if (val && /^#[0-9A-F]{6}$/i.test(val)) {
                      setHeaderGradientEnd(val);
                    } else if (val) {
                      webToast('Invalid Color', 'Please enter a valid hex color');
                    }
                  }
                }}>
                  <Text style={{ color: '#0f172a' }}>{headerGradientEnd}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[settingsStyles.saveButton, { marginLeft: 12 }]} onPress={() => saveBranding()}>
                  <Text style={settingsStyles.saveButtonText}>Save Gradient</Text>
                </TouchableOpacity>
                <View style={{ width: 56, height: 28, marginLeft: 12, borderRadius: 4, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' }}>
                  <LinearGradient colors={[headerGradientStart, headerGradientEnd]} style={{ flex: 1 }} />
                </View>
              </>
            )}
          </View>
        </View>

        <View style={settingsStyles.settingItem}>
          <Text style={settingsStyles.settingName}>Uploaded Images</Text>
          <Text style={settingsStyles.settingDescription}>Select an existing uploaded image to use as the site logo, or delete unused uploads.</Text>
          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {
                // Only show site-logo* files (and ensure active logo is included)
                (() => {
                  const siteOnly = availableLogos.filter(f => f.toLowerCase().startsWith('site-logo'));
                  if (logoFilename && !siteOnly.includes(logoFilename) && availableLogos.includes(logoFilename)) {
                    siteOnly.unshift(logoFilename);
                  }
                  if (siteOnly.length === 0) {
                    return <Text style={settingsStyles.settingDescription}>No uploaded site-logo images found.</Text>;
                  }
                  return siteOnly.map((f, idx) => (
                    <View key={idx} style={{ width: 88, marginRight: 8, marginBottom: 12 }}>
                      <TouchableOpacity onPress={() => {
                        // set as selected logo and save
                        setLogoFilename(f);
                        saveBranding();
                      }} style={{ borderRadius: 8, overflow: 'hidden', borderWidth: logoFilename === f ? 2 : 1, borderColor: logoFilename === f ? '#059669' : '#e2e8f0' }}>
                        <Image source={{ uri: assetUrl(f) }} style={{ width: 88, height: 88 }} />
                      </TouchableOpacity>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                        <Text style={{ fontSize: 12, maxWidth: 68 }} numberOfLines={1}>{f}</Text>
                        <TouchableOpacity onPress={async () => {
                          const ok = await (isWeb ? webConfirm(`Delete ${f}? This cannot be undone`) : Promise.resolve(false));
                          if (!ok) return;
                          try {
                            const res = await fetch(api(`/api/site/logo/${encodeURIComponent(f)}`), { method: 'DELETE', credentials: 'include' });
                            if (!res.ok) {
                              const txt = await res.text();
                              webToast('Delete failed', txt || `${res.status}`);
                            } else {
                              webToast('Deleted', `${f} deleted`);
                              // if deleted current logo, header will revert to defaults via server logic
                              await fetchAvailableLogos();
                              const sres = await fetch(api('/api/site/settings'), { credentials: 'include' });
                              if (sres.ok) {
                                const sjson = await sres.json();
                                if (sjson.logoFilename) setLogoFilename(sjson.logoFilename);
                              }
                            }
                          } catch (e) {
                            console.error('Delete error', e);
                            webToast('Error', 'Failed to delete');
                          }
                        }} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
                          <Text style={{ color: '#ef4444', fontSize: 12 }}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ));
                })()
              }
            </View>
          </View>
          <View style={{ marginTop: 8 }}>
            <TouchableOpacity style={settingsStyles.saveButton} onPress={fetchAvailableLogos}>
              <Text style={settingsStyles.saveButtonText}>Refresh List</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={settingsStyles.settingItem}>
          <Text style={settingsStyles.settingName}>Header Text Font</Text>
          <Text style={settingsStyles.settingDescription}>Choose the font used for the header text. Preview updates are applied immediately (web only for custom fonts).</Text>

          {/* Row: preview box + font name + controls */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            {/* Preview box */}
            <View style={{ width: 140, marginRight: 12 }}>
              <View style={{ width: '100%', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                {/* Quote the family name so multi-word font names (e.g. "Open Sans") work correctly */}
                <Text style={{ fontFamily: `"${siteFont}", Poppins, sans-serif`, fontSize: 20, fontWeight: '700', color: '#0f172a' }}>Aa</Text>
                <Text style={{ fontFamily: `"${siteFont}", Poppins, sans-serif`, fontSize: 14, fontWeight: '700', color: '#64748b', marginTop: 6 }}>{/* show the sample word */}SaversDream</Text>
              </View>
            </View>

            {/* Font name and controls */}
            <View style={{ flex: 1 }}>
              <Text style={[settingsStyles.settingDescription, { fontWeight: '700' }]}>{siteFont}</Text>
            </View>

            <TouchableOpacity
              style={[settingsStyles.saveButton, { marginRight: 8, backgroundColor: '#6366f1' }]}
              onPress={() => {
                // cycle to next font option
                const idx = fontOptions.indexOf(siteFont);
                const next = fontOptions[(idx + 1) % fontOptions.length];
                setSiteFont(next);
              }}
            >
              <Text style={settingsStyles.saveButtonText}>Next</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[settingsStyles.saveButton, { backgroundColor: '#059669' }]} onPress={() => saveBranding()}>
              <Text style={settingsStyles.saveButtonText}>Save Font</Text>
            </TouchableOpacity>
          </View>
          {/* Custom Google Font loader (web only) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <TextInput
              value={customFontInput}
              onChangeText={setCustomFontInput}
              placeholder="e.g. Satoshi, Space Grotesk"
              placeholderTextColor="#94a3b8"
              style={[settingsStyles.numberInput, { flex: 1, marginRight: 8, paddingVertical: 8 }]}
            />
            <TouchableOpacity style={[settingsStyles.saveButton, { backgroundColor: '#6366f1' }]} onPress={() => loadGoogleFont(customFontInput)}>
              <Text style={settingsStyles.saveButtonText}>Load & Select</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <SettingCard title="Content Moderation" icon={<Shield size={20} color="#ef4444" />}>
        <ToggleSetting
          title="Auto-approve Verified Users"
          description="Deals from verified users go live instantly"
          value={settings.auto_approve_verified || false}
          onToggle={(value) => toggleAndNotify('auto_approve_verified', 'Auto-approve Verified Users', value)}
        />
        <ToggleSetting
          title="Require Moderation for New Deals"
          description="All new deals require manual approval"
            value={typeof settings.require_moderation_new_deals === 'boolean' ? settings.require_moderation_new_deals : true}
            onToggle={(value) => toggleAndNotify('require_moderation_new_deals', 'Require Moderation for New Deals', value)}
        />
        <ToggleSetting
          title="Auto-delete Expired Deals"
          description="Automatically remove deals after expiry"
          value={settings.auto_delete_expired_days ? true : false}
          onToggle={(value) => toggleAndNotify('auto_delete_expired_days' as any, 'Auto-delete Expired Deals', value)}
        />
      </SettingCard>

      <SettingCard title="User Permissions" icon={<Users size={20} color="#10b981" />}>
        <ToggleSetting
          title="Allow Guest Posting"
          description="Guests can submit deals without an account"
          value={settings.allow_guest_posting || false}
          onToggle={(value) => toggleAndNotify('allow_guest_posting', 'Allow Guest Posting', value)}
        />
        <NumberSetting
          title="Max Daily Posts per User"
          description="Limit on deals a user can post daily"
          value={tempValues.maxDailyPosts}
          onChangeText={(text) => setTempValues(prev => ({ ...prev, maxDailyPosts: text }))}
          onSave={() => updateNumericSetting('maxDailyPosts', 'max_daily_posts_per_user')}
          fieldKey="maxDailyPosts"
          placeholder="5"
        />
        <NumberSetting
          title="Min Reputation to Post"
          description="Minimum reputation score required to post deals"
          value={tempValues.minReputationToPost}
          onChangeText={(text) => setTempValues(prev => ({ ...prev, minReputationToPost: text }))}
          onSave={() => updateNumericSetting('minReputationToPost', 'min_reputation_to_post')}
          fieldKey="minReputationToPost"
          placeholder="2.0"
        />
      </SettingCard>

      <SettingCard title="System Limits" icon={<Clock size={20} color="#f59e0b" />}>
        <NumberSetting
          title="Deal Expiry (Days)"
          description="Default expiry time for new deals"
          value={tempValues.dealExpiryDays}
          onChangeText={(text) => setTempValues(prev => ({ ...prev, dealExpiryDays: text }))}
          onSave={() => webToast('Saved', 'Deal expiry setting updated')}
          fieldKey="dealExpiryDays"
          placeholder="30"
        />
        <NumberSetting
          title="Max Image Size (MB)"
          description="Maximum file size for deal images"
          value={tempValues.maxImageSize}
          onChangeText={(text) => setTempValues(prev => ({ ...prev, maxImageSize: text }))}
          onSave={() => webToast('Saved', 'Image size limit updated')}
          fieldKey="maxImageSize"
          placeholder="5"
        />
        <NumberSetting
          title="API Rate Limit (per minute)"
          description="Maximum API requests per user per minute"
          value={tempValues.rateLimit}
          onChangeText={(text) => setTempValues(prev => ({ ...prev, rateLimit: text }))}
          onSave={() => webToast('Saved', 'Rate limit updated')}
          fieldKey="rateLimit"
          placeholder="100"
        />
      </SettingCard>

      <SettingCard title="Content Settings" icon={<Settings size={20} color="#06b6d4" />}>
        <NumberSetting
          title="Max Comment Length"
          description="Maximum characters allowed in comments"
          value={tempValues.maxCommentLength}
          onChangeText={(text) => setTempValues(prev => ({ ...prev, maxCommentLength: text }))}
          onSave={() => webToast('Saved', 'Comment length limit updated')}
          fieldKey="maxCommentLength"
          placeholder="500"
        />
        <NumberSetting
          title="Soft Delete Retention (Days)"
          description="Days to keep deleted deals before permanent deletion"
          value={tempValues.softDeleteRetentionDays}
          onChangeText={(text) => setTempValues(prev => ({ ...prev, softDeleteRetentionDays: text }))}
          onSave={() => updateNumericSetting('softDeleteRetentionDays', 'soft_delete_retention_days')}
          fieldKey="softDeleteRetentionDays"
          placeholder="30"
        />
        <NumberSetting
          title="Auto-delete Expired Deals (Days)"
          description="Days after expiry before deals are permanently deleted"
          value={tempValues.autoDeleteExpired}
          onChangeText={(text) => setTempValues(prev => ({ ...prev, autoDeleteExpired: text }))}
          onSave={() => webToast('Saved', 'Auto-delete setting updated')}
          fieldKey="autoDeleteExpired"
          placeholder="7"
        />
        <ToggleSetting
          title="Enable Content Filtering"
          description="Automatically filter inappropriate content"
          value={settings.enable_content_filtering ?? true}
          onToggle={(value) => toggleAndNotify('enable_content_filtering' as any, 'Enable Content Filtering', value)}
        />
        <ToggleSetting
          title="Require Deal Images"
          description="Force users to add images when posting deals"
          value={settings.require_deal_images ?? false}
          onToggle={(value) => toggleAndNotify('require_deal_images' as any, 'Require Deal Images', value)}
        />
      </SettingCard>

      <SettingCard title="Platform Features" icon={<Globe size={20} color="#8b5cf6" />}>
        <ToggleSetting
          title="Enable Location Services"
          description="Allow users to filter deals by location"
          value={settings.enable_location_services ?? true}
          onToggle={(value) => toggleAndNotify('enable_location_services' as any, 'Enable Location Services', value)}
        />
        <ToggleSetting
          title="Enable Push Notifications"
          description="Send notifications for new deals and updates"
          value={settings.enable_push_notifications ?? true}
          onToggle={(value) => toggleAndNotify('enable_push_notifications' as any, 'Enable Push Notifications', value)}
        />
        <ToggleSetting
          title="Enable Social Sharing"
          description="Allow users to share deals on social media"
          value={settings.enable_social_sharing ?? true}
          onToggle={(value) => toggleAndNotify('enable_social_sharing' as any, 'Enable Social Sharing', value)}
        />
        <ToggleSetting
          title="Maintenance Mode"
          description="Put the platform in maintenance mode"
          value={settings.maintenance_mode ?? false}
          onToggle={async (value) => {
            const confirmed = await (isWeb ? webConfirm(value ? 'Platform will enter maintenance mode' : 'Platform will exit maintenance mode') : Promise.resolve(true));
            if (!confirmed) return;
            await toggleAndNotify('maintenance_mode' as any, 'Maintenance Mode', value);
          }}
        />
      </SettingCard>

      <SettingCard title="Analytics & Monitoring" icon={<Star size={20} color="#06b6d4" />}>
        <ToggleSetting
          title="Enable Analytics Tracking"
          description="Track user behavior and deal performance"
          value={settings.enable_analytics ?? true}
          onToggle={(value) => toggleAndNotify('enable_analytics' as any, 'Enable Analytics Tracking', value)}
        />
        <ToggleSetting
          title="Enable Error Reporting"
          description="Automatically report system errors"
          value={settings.enable_error_reporting ?? true}
          onToggle={(value) => toggleAndNotify('enable_error_reporting' as any, 'Enable Error Reporting', value)}
        />
        <ToggleSetting
          title="Enable Performance Monitoring"
          description="Monitor system performance metrics"
          value={settings.enable_performance_monitoring ?? true}
          onToggle={(value) => toggleAndNotify('enable_performance_monitoring' as any, 'Enable Performance Monitoring', value)}
        />
      </SettingCard>

      <SettingCard title="Site Tests" icon={<Clock size={20} color="#94a3b8" />}>
        <View style={settingsStyles.settingItem}>
          <Text style={settingsStyles.settingName}>Run site smoke tests</Text>
          <Text style={settingsStyles.settingDescription}>Run quick checks against the site settings API to verify persistence.</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            {isDev ? (
              <TouchableOpacity
                style={settingsStyles.saveButton}
                onPress={async () => {
                  try {
                    const payload = { maintenance_mode: true, enable_push_notifications: false };
                    const res = await fetch(api('/api/site/settings/dev-write'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    const json = await res.json();
                    const msg = `Dev write: ${res.status} ${res.statusText} - ${JSON.stringify(json?.message || json)}`;
                    webToast(res.ok ? 'Test OK' : 'Test failed', msg);
                    setTestLog(prev => [msg, ...prev].slice(0, 20));
                  } catch (err: any) {
                    const msg = `Dev write error: ${err?.message || String(err)}`;
                    webToast('Test error', msg);
                    setTestLog(prev => [msg, ...prev].slice(0, 20));
                  }
                }}
              >
                <Text style={settingsStyles.saveButtonText}>Run Dev Write</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[settingsStyles.saveButton, { backgroundColor: '#06b6d4' }]}
              onPress={async () => {
                try {
                  const res = await fetch(api('/api/site/settings'));
                    const json = await res.json();
                  const msg = `Fetch: ${res.status} ${res.statusText} - ${JSON.stringify(json)}`;
                  webToast('Fetched', 'Current settings fetched');
                  setTestLog(prev => [msg, ...prev].slice(0, 50));
                } catch (err: any) {
                  const msg = `Fetch error: ${err?.message || String(err)}`;
                  webToast('Fetch error', msg);
                  setTestLog(prev => [msg, ...prev].slice(0, 50));
                }
              }}
            >
              <Text style={settingsStyles.saveButtonText}>Fetch Settings</Text>
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: 12 }}>
            <Text style={[settingsStyles.settingDescription, { fontStyle: 'italic' }]}>Results will appear as toasts and in the log below.</Text>
            <View style={{ marginTop: 8, maxHeight: 200, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 8, backgroundColor: '#fff' }}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }}>
                {testLog.length === 0 ? (
                  <Text style={settingsStyles.settingDescription}>No test runs yet.</Text>
                ) : (
                  testLog.map((l, idx) => (
                    <Text key={idx} style={{ fontSize: 12, color: '#334155', marginBottom: 6 }}>{l}</Text>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </SettingCard>

      <View style={settingsStyles.bottomPadding} />
    </ScrollView>
  );
};

const settingsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginTop: 20,
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginHorizontal: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 12,
  },
  settingItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  numberInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#1e293b',
    marginRight: 12,
  },
  saveButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});
