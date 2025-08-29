import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
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
    dealExpiryDays: '30',
    maxImageSize: '5',
    rateLimit: '100',
    maintenanceMessage: 'System maintenance in progress...',
    welcomeMessage: 'Welcome to SpicyBeats!',
    maxCommentLength: '500',
    autoDeleteExpired: '7',
  });

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

  const NumberSetting = ({ title, description, value, onChangeText, onSave, placeholder }: { title: string; description: string; value: string; onChangeText: (text: string) => void; onSave: () => void; placeholder?: string }) => (
    <View style={settingsStyles.settingItem}>
      <View style={settingsStyles.settingTextContainer}>
        <Text style={settingsStyles.settingName}>{title}</Text>
        <Text style={settingsStyles.settingDescription}>{description}</Text>
        <View style={settingsStyles.inputContainer}>
          <TextInput
            style={settingsStyles.numberInput}
            value={value}
            onChangeText={onChangeText}
            keyboardType="numeric"
            placeholder={placeholder}
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity style={settingsStyles.saveButton} onPress={onSave}>
            <Text style={settingsStyles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={settingsStyles.container} showsVerticalScrollIndicator={false}>
      <View style={settingsStyles.header}>
        <LinearGradient colors={['#6366f1', '#4f46e5']} style={settingsStyles.headerGradient}>
          <Settings size={24} color="#FFFFFF" />
          <Text style={settingsStyles.headerTitle}>System Settings</Text>
        </LinearGradient>
      </View>

      <SettingCard title="Content Moderation" icon={<Shield size={20} color="#ef4444" />}>
        <ToggleSetting
          title="Auto-approve Verified Users"
          description="Deals from verified users go live instantly"
          value={settings.auto_approve_verified || false}
          onToggle={(value) => onUpdateSetting('auto_approve_verified', value)}
        />
        <ToggleSetting
          title="Require Moderation for New Deals"
          description="All new deals require manual approval"
          value={settings.require_moderation_new_deals || true}
          onToggle={(value) => onUpdateSetting('require_moderation_new_deals', value)}
        />
        <ToggleSetting
          title="Auto-delete Expired Deals"
          description="Automatically remove deals after expiry"
          value={true}
          onToggle={() => Alert.alert('Feature', 'Auto-delete configuration saved')}
        />
      </SettingCard>

      <SettingCard title="User Permissions" icon={<Users size={20} color="#10b981" />}>
        <ToggleSetting
          title="Allow Guest Posting"
          description="Guests can submit deals without an account"
          value={settings.allow_guest_posting || false}
          onToggle={(value) => onUpdateSetting('allow_guest_posting', value)}
        />
        <NumberSetting
          title="Max Daily Posts per User"
          description="Limit on deals a user can post daily"
          value={tempValues.maxDailyPosts}
          onChangeText={(text) => setTempValues(prev => ({ ...prev, maxDailyPosts: text }))}
          onSave={() => updateNumericSetting('maxDailyPosts', 'max_daily_posts_per_user')}
          placeholder="5"
        />
        <NumberSetting
          title="Min Reputation to Post"
          description="Minimum reputation score required to post deals"
          value={tempValues.minReputationToPost}
          onChangeText={(text) => setTempValues(prev => ({ ...prev, minReputationToPost: text }))}
          onSave={() => updateNumericSetting('minReputationToPost', 'min_reputation_to_post')}
          placeholder="2.0"
        />
      </SettingCard>

      <SettingCard title="System Limits" icon={<Clock size={20} color="#f59e0b" />}>
        <NumberSetting
          title="Deal Expiry (Days)"
          description="Default expiry time for new deals"
          value={tempValues.dealExpiryDays}
          onChangeText={(text) => setTempValues(prev => ({ ...prev, dealExpiryDays: text }))}
          onSave={() => Alert.alert('Saved', 'Deal expiry setting updated')}
          placeholder="30"
        />
        <NumberSetting
          title="Max Image Size (MB)"
          description="Maximum file size for deal images"
          value={tempValues.maxImageSize}
          onChangeText={(text) => setTempValues(prev => ({ ...prev, maxImageSize: text }))}
          onSave={() => Alert.alert('Saved', 'Image size limit updated')}
          placeholder="5"
        />
        <NumberSetting
          title="API Rate Limit (per minute)"
          description="Maximum API requests per user per minute"
          value={tempValues.rateLimit}
          onChangeText={(text) => setTempValues(prev => ({ ...prev, rateLimit: text }))}
          onSave={() => Alert.alert('Saved', 'Rate limit updated')}
          placeholder="100"
        />
      </SettingCard>

      <SettingCard title="Content Settings" icon={<Settings size={20} color="#06b6d4" />}>
        <NumberSetting
          title="Max Comment Length"
          description="Maximum characters allowed in comments"
          value={tempValues.maxCommentLength}
          onChangeText={(text) => setTempValues(prev => ({ ...prev, maxCommentLength: text }))}
          onSave={() => Alert.alert('Saved', 'Comment length limit updated')}
          placeholder="500"
        />
        <NumberSetting
          title="Auto-delete Expired Deals (Days)"
          description="Days after expiry before deals are permanently deleted"
          value={tempValues.autoDeleteExpired}
          onChangeText={(text) => setTempValues(prev => ({ ...prev, autoDeleteExpired: text }))}
          onSave={() => Alert.alert('Saved', 'Auto-delete setting updated')}
          placeholder="7"
        />
        <ToggleSetting
          title="Enable Content Filtering"
          description="Automatically filter inappropriate content"
          value={true}
          onToggle={() => Alert.alert('Feature', 'Content filtering setting updated')}
        />
        <ToggleSetting
          title="Require Deal Images"
          description="Force users to add images when posting deals"
          value={false}
          onToggle={() => Alert.alert('Feature', 'Deal image requirement setting updated')}
        />
      </SettingCard>

      <SettingCard title="Platform Features" icon={<Globe size={20} color="#8b5cf6" />}>
        <ToggleSetting
          title="Enable Location Services"
          description="Allow users to filter deals by location"
          value={true}
          onToggle={() => Alert.alert('Feature', 'Location services setting updated')}
        />
        <ToggleSetting
          title="Enable Push Notifications"
          description="Send notifications for new deals and updates"
          value={true}
          onToggle={() => Alert.alert('Feature', 'Push notifications setting updated')}
        />
        <ToggleSetting
          title="Enable Social Sharing"
          description="Allow users to share deals on social media"
          value={true}
          onToggle={() => Alert.alert('Feature', 'Social sharing setting updated')}
        />
        <ToggleSetting
          title="Maintenance Mode"
          description="Put the platform in maintenance mode"
          value={false}
          onToggle={(value) => Alert.alert('Warning', value ? 'Platform will enter maintenance mode' : 'Platform will exit maintenance mode')}
        />
      </SettingCard>

      <SettingCard title="Analytics & Monitoring" icon={<Star size={20} color="#06b6d4" />}>
        <ToggleSetting
          title="Enable Analytics Tracking"
          description="Track user behavior and deal performance"
          value={true}
          onToggle={() => Alert.alert('Feature', 'Analytics tracking setting updated')}
        />
        <ToggleSetting
          title="Enable Error Reporting"
          description="Automatically report system errors"
          value={true}
          onToggle={() => Alert.alert('Feature', 'Error reporting setting updated')}
        />
        <ToggleSetting
          title="Enable Performance Monitoring"
          description="Monitor system performance metrics"
          value={true}
          onToggle={() => Alert.alert('Feature', 'Performance monitoring setting updated')}
        />
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
