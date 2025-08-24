import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { SystemSettings } from '@/hooks/useAdminData';

interface SystemSettingsManagementProps {
  settings: SystemSettings;
  onUpdateSetting: <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => void;
}

export const SystemSettingsManagement: React.FC<SystemSettingsManagementProps> = ({ settings, onUpdateSetting }) => {
  return (
    <View style={settingsStyles.container}>
      <Text style={settingsStyles.headerTitle}>System Settings</Text>
      
      <View style={settingsStyles.settingCard}>
        <View style={settingsStyles.settingItem}>
          <View style={settingsStyles.settingTextContainer}>
            <Text style={settingsStyles.settingName}>Auto-approve Verified Users</Text>
            <Text style={settingsStyles.settingDescription}>Deals from verified users go live instantly.</Text>
          </View>
          <Switch
            value={settings.autoApproveVerifiedUsers}
            onValueChange={(value) => onUpdateSetting('autoApproveVerifiedUsers', value)}
            trackColor={{ false: '#E5E7EB', true: '#10b981' }}
            thumbColor={settings.autoApproveVerifiedUsers ? '#FFFFFF' : '#F3F4F6'}
          />
        </View>

        <View style={settingsStyles.settingItem}>
          <View style={settingsStyles.settingTextContainer}>
            <Text style={settingsStyles.settingName}>Require Moderation for New Deals</Text>
            <Text style={settingsStyles.settingDescription}>All new deals require manual approval.</Text>
          </View>
          <Switch
            value={settings.requireModeration}
            onValueChange={(value) => onUpdateSetting('requireModeration', value)}
            trackColor={{ false: '#E5E7EB', true: '#10b981' }}
            thumbColor={settings.requireModeration ? '#FFFFFF' : '#F3F4F6'}
          />
        </View>

        <View style={settingsStyles.settingItem}>
          <View style={settingsStyles.settingTextContainer}>
            <Text style={settingsStyles.settingName}>Allow Guest Posting</Text>
            <Text style={settingsStyles.settingDescription}>Guests can submit deals without an account.</Text>
          </View>
          <Switch
            value={settings.allowGuestPosting}
            onValueChange={(value) => onUpdateSetting('allowGuestPosting', value)}
            trackColor={{ false: '#E5E7EB', true: '#10b981' }}
            thumbColor={settings.allowGuestPosting ? '#FFFFFF' : '#F3F4F6'}
          />
        </View>

        <View style={settingsStyles.settingItem}>
          <View style={settingsStyles.settingTextContainer}>
            <Text style={settingsStyles.settingName}>Max Daily Posts per User</Text>
            <Text style={settingsStyles.settingDescription}>Limit on deals a user can post daily.</Text>
          </View>
          <Switch // Using switch for simplicity, could be TextInput for exact number
            value={settings.maxDailyPosts > 0}
            onValueChange={(value) => onUpdateSetting('maxDailyPosts', value ? 5 : 0)}
            trackColor={{ false: '#E5E7EB', true: '#10b981' }}
            thumbColor={settings.maxDailyPosts > 0 ? '#FFFFFF' : '#F3F4F6'}
          />
        </View>

        <View style={settingsStyles.settingItem}>
          <View style={settingsStyles.settingTextContainer}>
            <Text style={settingsStyles.settingName}>Min Reputation to Post</Text>
            <Text style={settingsStyles.settingDescription}>Minimum reputation score required to post deals.</Text>
          </View>
          <Switch // Using switch for simplicity, could be TextInput for exact number
            value={settings.minReputationToPost > 0}
            onValueChange={(value) => onUpdateSetting('minReputationToPost', value ? 2.0 : 0)}
            trackColor={{ false: '#E5E7EB', true: '#10b981' }}
            thumbColor={settings.minReputationToPost > 0 ? '#FFFFFF' : '#F3F4F6'}
          />
        </View>
      </View>
    </View>
  );
};

const settingsStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 20,
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  settingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#64748b',
  },
});
