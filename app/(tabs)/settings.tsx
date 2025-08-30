import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
  Moon,
  Globe,
  Shield,
  Trash2,
  Key,
  User,
  Mail,
  Smartphone,
  Volume2,
  Eye,
  Lock
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthProvider';
import { useCurrency, CURRENCIES } from '@/contexts/CurrencyProvider';
import { useTheme } from '@/contexts/ThemeProvider';
import { userSettingsService, UserSettings } from '@/services/userSettingsService';
import { useFocusEffect } from '@react-navigation/native';

/* -------------------- Small in-app confirm dialog (no browser popups) -------------------- */
function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onCancel} style={[styles.modalBtn, styles.modalCancel]}>
              <Text style={styles.modalCancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={[styles.modalBtn, destructive ? styles.modalDanger : styles.modalPrimary]}
            >
              <Text style={styles.modalConfirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
/* ---------------------------------------------------------------------------------------- */

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { currency, setCurrency, availableCurrencies } = useCurrency();
  const { theme, toggleTheme, colors } = useTheme();

  // Settings state from service
  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: true,
    emailNotifications: false,
    soundEnabled: true,
    vibrationEnabled: true,
  });
  const [privacySettings, setPrivacySettings] = useState({
    profileVisible: true,
    showEmail: false,
    showLocation: true,
    allowDirectMessages: true,
  });
  const [appSettings, setAppSettings] = useState({
    darkMode: false,
    autoRefresh: true,
    showTutorials: true,
  });

  const [loading, setLoading] = useState(true);

  // local state for in-app confirms
  const [signoutOpen, setSignoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Load settings from service
  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data: allSettings, error } = await userSettingsService.getAllSettings();
      
      if (error) {
        console.error('Error loading settings:', error);
        return;
      }

      if (allSettings) {
        setNotificationSettings(allSettings.notifications);
        setPrivacySettings(allSettings.privacy);
        setAppSettings(allSettings.app);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load settings on focus
  useFocusEffect(
    React.useCallback(() => {
      loadSettings();
    }, [])
  );

  const toggleNotification = async (k: keyof typeof notificationSettings) => {
    const newValue = !notificationSettings[k];
    setNotificationSettings(p => ({ ...p, [k]: newValue }));
    
    // Save to service
    try {
      await userSettingsService.updateNotificationPreferences({ [k]: newValue });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      // Revert on error
      setNotificationSettings(p => ({ ...p, [k]: !newValue }));
    }
  };

  const togglePrivacy = async (k: keyof typeof privacySettings) => {
    const newValue = !privacySettings[k];
    setPrivacySettings(p => ({ ...p, [k]: newValue }));
    
    // Save to service
    try {
      await userSettingsService.updatePrivacySettings({ [k]: newValue });
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      // Revert on error
      setPrivacySettings(p => ({ ...p, [k]: !newValue }));
    }
  };

  const toggleApp = async (k: keyof typeof appSettings) => {
    const newValue = !appSettings[k];
    setAppSettings(p => ({ ...p, [k]: newValue }));
    
    // Save to service
    try {
      await userSettingsService.updateAppSettings({ [k]: newValue });
    } catch (error) {
      console.error('Error updating app settings:', error);
      // Revert on error
      setAppSettings(p => ({ ...p, [k]: !newValue }));
    }
  };

  const handleChangePassword = () => {
    router.push('/change-password');
  };

  const handleCurrencySelect = async (selectedCurrency: any) => {
    try {
      await setCurrency(selectedCurrency);
    } catch (error) {
      console.error('Error setting currency:', error);
    }
  };

  const cycleCurrency = async () => {
    try {
      const currentIndex = availableCurrencies.findIndex(c => c.code === currency.code);
      const nextIndex = (currentIndex + 1) % availableCurrencies.length;
      const nextCurrency = availableCurrencies[nextIndex];
      await setCurrency(nextCurrency);
    } catch (error) {
      console.error('Error cycling currency:', error);
    }
  };

  const handleSignOut = () => setSignoutOpen(true);
  const confirmSignOut = async () => {
    setSignoutOpen(false);
    try {
      await signOut();
      router.replace('/sign-in'); // navigate after state clears
    } catch (e) {
      // optionally show a toast/snackbar here
      console.error('Sign out failed:', e);
    }
  };

  const handleDeleteAccount = () => setDeleteOpen(true);
  const confirmDeleteAccount = async () => {
    setDeleteOpen(false);
    // call your delete logic here (no browser popups)
    // await userService.deleteMyAccount();
    // router.replace('/goodbye');
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        <View style={styles.guestContainer}>
          <Text style={styles.guestTitle}>Sign in to access settings</Text>
          <Text style={styles.guestDescription}>
            Customize your SpicyBeats experience with personalized settings
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/sign-in')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
          <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <ArrowLeft size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Settings</Text>
              <View style={styles.headerSpacer} />
            </View>
          </SafeAreaView>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading settings...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
        {/* Sign out confirm */}
        <ConfirmDialog
          visible={signoutOpen}
          title="Sign Out"
          message="Are you sure you want to sign out?"
          confirmText="Sign Out"
          cancelText="Cancel"
          destructive
          onConfirm={confirmSignOut}
          onCancel={() => setSignoutOpen(false)}
        />

        {/* Delete account confirm */}
        <ConfirmDialog
          visible={deleteOpen}
          title="Delete Account"
          message="This will permanently delete your account and data. This action cannot be undone."
          confirmText="Delete Forever"
          cancelText="Cancel"
          destructive
          onConfirm={confirmDeleteAccount}
          onCancel={() => setDeleteOpen(false)}
        />

        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Settings</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>

        <ScrollView style={[styles.content, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
          {/* Account */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => router.push('/edit-profile')}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <User size={20} color="#6366f1" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingName}>Edit Profile</Text>
                <Text style={styles.settingDescription}>Update your personal information</Text>
              </View>
            </View>
            <Text style={styles.settingValue}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleChangePassword}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Key size={20} color="#f59e0b" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingName}>Change Password</Text>
                <Text style={styles.settingDescription}>Update your account password</Text>
              </View>
            </View>
            <Text style={styles.settingValue}>→</Text>
          </TouchableOpacity>
          </View>

          {/* Notifications */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Bell size={20} color="#10b981" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingName, { color: colors.text }]}>Push Notifications</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>Receive notifications about new deals</Text>
              </View>
            </View>
            <Switch
              value={notificationSettings.pushNotifications}
              onValueChange={() => toggleNotification('pushNotifications')}
              trackColor={{ false: '#e5e7eb', true: '#10b981' }}
              thumbColor={notificationSettings.pushNotifications ? '#ffffff' : '#f3f4f6'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Mail size={20} color="#3b82f6" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingName}>Email Notifications</Text>
                <Text style={styles.settingDescription}>Get deal alerts via email</Text>
              </View>
            </View>
            <Switch
              value={notificationSettings.emailNotifications}
              onValueChange={() => toggleNotification('emailNotifications')}
              trackColor={{ false: '#e5e7eb', true: '#10b981' }}
              thumbColor={notificationSettings.emailNotifications ? '#ffffff' : '#f3f4f6'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Volume2 size={20} color="#8b5cf6" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingName}>Sound</Text>
                <Text style={styles.settingDescription}>Play sounds for notifications</Text>
              </View>
            </View>
            <Switch
              value={notificationSettings.soundEnabled}
              onValueChange={() => toggleNotification('soundEnabled')}
              trackColor={{ false: '#e5e7eb', true: '#10b981' }}
              thumbColor={notificationSettings.soundEnabled ? '#ffffff' : '#f3f4f6'}
            />
          </View>

          {Platform.OS !== 'web' && (
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Smartphone size={20} color="#ef4444" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingName}>Vibration</Text>
                  <Text style={styles.settingDescription}>Vibrate for notifications</Text>
                </View>
              </View>
              <Switch
                value={notificationSettings.vibrationEnabled}
                onValueChange={() => toggleNotification('vibrationEnabled')}
                trackColor={{ false: '#e5e7eb', true: '#10b981' }}
                thumbColor={notificationSettings.vibrationEnabled ? '#ffffff' : '#f3f4f6'}
              />
            </View>
          )}
          </View>

          {/* Privacy */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Eye size={20} color="#6366f1" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingName}>Public Profile</Text>
                <Text style={styles.settingDescription}>Make your profile visible to others</Text>
              </View>
            </View>
            <Switch
              value={privacySettings.profileVisible}
              onValueChange={() => togglePrivacy('profileVisible')}
              trackColor={{ false: '#e5e7eb', true: '#10b981' }}
              thumbColor={privacySettings.profileVisible ? '#ffffff' : '#f3f4f6'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Mail size={20} color="#f59e0b" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingName}>Show Email</Text>
                <Text style={styles.settingDescription}>Display email on your public profile</Text>
              </View>
            </View>
            <Switch
              value={privacySettings.showEmail}
              onValueChange={() => togglePrivacy('showEmail')}
              trackColor={{ false: '#e5e7eb', true: '#10b981' }}
              thumbColor={privacySettings.showEmail ? '#ffffff' : '#f3f4f6'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Shield size={20} color="#10b981" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingName}>Show Location</Text>
                <Text style={styles.settingDescription}>Display your location on profile</Text>
              </View>
            </View>
            <Switch
              value={privacySettings.showLocation}
              onValueChange={() => togglePrivacy('showLocation')}
              trackColor={{ false: '#e5e7eb', true: '#10b981' }}
              thumbColor={privacySettings.showLocation ? '#ffffff' : '#f3f4f6'}
            />
          </View>
          </View>

          {/* App Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Preferences</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Moon size={20} color="#8b5cf6" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingName}>Dark Mode</Text>
                <Text style={styles.settingDescription}>Use dark theme for the app</Text>
              </View>
            </View>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: '#e5e7eb', true: '#10b981' }}
              thumbColor={theme === 'dark' ? '#ffffff' : '#f3f4f6'}
            />
          </View>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={cycleCurrency}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Globe size={20} color="#3b82f6" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingName}>Currency</Text>
                <Text style={styles.settingDescription}>Choose your preferred currency</Text>
              </View>
            </View>
            <Text style={styles.settingValue}>{currency.symbol} {currency.code}</Text>
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Smartphone size={20} color="#ef4444" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingName}>Auto Refresh</Text>
                <Text style={styles.settingDescription}>Automatically refresh deals feed</Text>
              </View>
            </View>
            <Switch
              value={appSettings.autoRefresh}
              onValueChange={() => toggleApp('autoRefresh')}
              trackColor={{ false: '#e5e7eb', true: '#10b981' }}
              thumbColor={appSettings.autoRefresh ? '#ffffff' : '#f3f4f6'}
            />
          </View>
          </View>

          {/* Account Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Actions</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleSignOut}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, styles.signOutIcon]}>
                <Lock size={20} color="#ef4444" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingName, styles.signOutText]}>Sign Out</Text>
                <Text style={styles.settingDescription}>Sign out of your account</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleDeleteAccount}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, styles.deleteIcon]}>
                <Trash2 size={20} color="#dc2626" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingName, styles.deleteText]}>Delete Account</Text>
                <Text style={styles.settingDescription}>Permanently delete your account</Text>
              </View>
            </View>
          </TouchableOpacity>
          </View>

          {/* About */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Platform</Text>
            <Text style={styles.infoValue}>{Platform.OS === 'web' ? 'Web' : Platform.OS}</Text>
          </View>
          
          <TouchableOpacity style={styles.infoItem}>
            <Text style={styles.infoLabel}>Privacy Policy</Text>
            <Text style={styles.infoLink}>View →</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.infoItem}>
            <Text style={styles.infoLabel}>Terms of Service</Text>
            <Text style={styles.infoLink}>View →</Text>
          </TouchableOpacity>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  safeArea: { paddingBottom: 0 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },

  content: { flex: 1 },

  guestContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  guestTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b', textAlign: 'center', marginBottom: 16 },
  guestDescription: { fontSize: 16, color: '#64748b', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  signInButton: { backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  signInButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },

  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
    paddingHorizontal: 20,
    letterSpacing: -0.3,
  },

  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  signOutIcon: { backgroundColor: '#fef2f2' },
  deleteIcon: { backgroundColor: '#fef2f2' },
  settingTextContainer: { flex: 1 },
  settingName: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4 },
  signOutText: { color: '#ef4444' },
  deleteText: { color: '#dc2626' },
  settingDescription: { fontSize: 14, color: '#64748b' },
  settingValue: { fontSize: 16, fontWeight: '600', color: '#6366f1' },

  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: { fontSize: 16, fontWeight: '600', color: '#374151' },
  infoValue: { fontSize: 16, color: '#64748b' },
  infoLink: { fontSize: 16, fontWeight: '600', color: '#6366f1' },

  bottomPadding: { height: 100 },

  // Loading state styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },

  // modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  modalMessage: { fontSize: 15, color: '#374151', lineHeight: 22 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  modalBtn: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, marginLeft: 8 },
  modalCancel: { backgroundColor: '#eef2ff' },
  modalPrimary: { backgroundColor: '#6366f1' },
  modalDanger: { backgroundColor: '#ef4444' },
  modalCancelText: { color: '#1f2937', fontWeight: '700' },
  modalConfirmText: { color: '#fff', fontWeight: '700' },
});
