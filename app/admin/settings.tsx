import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TextInput, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Settings as SettingsIcon, Shield, Users, MessageSquare, Clock, Star, Bell, Globe } from 'lucide-react-native';
import { listConfig, upsertConfig } from '@/services/admin/flagsService';
import { elevate } from '@/services/adminElevation';

type SettingKey =
  | 'auto_approve_verified'
  | 'require_moderation_new_deals'
  | 'allow_guest_posting'
  | 'max_daily_posts_per_user'
  | 'min_reputation_to_post'
  | 'enable_push_notifications'
  | 'max_comment_length'
  | 'enable_user_reports'
  | 'auto_ban_threshold'
  | 'deal_expiry_days'
  | 'enable_location_verification'
  | 'maintenance_mode';

type Settings = {
  auto_approve_verified: boolean;
  require_moderation_new_deals: boolean;
  allow_guest_posting: boolean;
  max_daily_posts_per_user: number;
  min_reputation_to_post: number;
  enable_push_notifications: boolean;
  max_comment_length: number;
  enable_user_reports: boolean;
  auto_ban_threshold: number;
  deal_expiry_days: number;
  enable_location_verification: boolean;
  maintenance_mode: boolean;
};

const DEFAULTS: Settings = {
  auto_approve_verified: true,
  require_moderation_new_deals: true,
  allow_guest_posting: false,
  max_daily_posts_per_user: 10,
  min_reputation_to_post: 0,
  enable_push_notifications: true,
  max_comment_length: 500,
  enable_user_reports: true,
  auto_ban_threshold: 5,
  deal_expiry_days: 30,
  enable_location_verification: false,
  maintenance_mode: false,
};

export default function AdminSettings() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await listConfig();
      const map = Object.fromEntries((res.items || []).map((i: any) => [i.key, i.value]));
      setS({
        auto_approve_verified: (map.auto_approve_verified ?? DEFAULTS.auto_approve_verified) ? true : false,
        require_moderation_new_deals: (map.require_moderation_new_deals ?? DEFAULTS.require_moderation_new_deals) ? true : false,
        allow_guest_posting: (map.allow_guest_posting ?? DEFAULTS.allow_guest_posting) ? true : false,
        max_daily_posts_per_user: Number(map.max_daily_posts_per_user ?? DEFAULTS.max_daily_posts_per_user),
        min_reputation_to_post: Number(map.min_reputation_to_post ?? DEFAULTS.min_reputation_to_post),
        enable_push_notifications: (map.enable_push_notifications ?? DEFAULTS.enable_push_notifications) ? true : false,
        max_comment_length: Number(map.max_comment_length ?? DEFAULTS.max_comment_length),
        enable_user_reports: (map.enable_user_reports ?? DEFAULTS.enable_user_reports) ? true : false,
        auto_ban_threshold: Number(map.auto_ban_threshold ?? DEFAULTS.auto_ban_threshold),
        deal_expiry_days: Number(map.deal_expiry_days ?? DEFAULTS.deal_expiry_days),
        enable_location_verification: (map.enable_location_verification ?? DEFAULTS.enable_location_verification) ? true : false,
        maintenance_mode: (map.maintenance_mode ?? DEFAULTS.maintenance_mode) ? true : false,
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Unable to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveKey = async (key: SettingKey, value: any, type: 'bool'|'number') => {
    try { 
      const elevation = await elevate(8);
      await upsertConfig(key, value, type, { elevationToken: elevation.token }); 
      Alert.alert('Success', 'Setting saved successfully');
    }
    catch (e: any) { 
      Alert.alert('Error', e.message || 'Failed to save setting'); 
      // Reload to revert UI changes
      load();
    }
  };

  const Row = ({ title, sub, right, icon }: { title: string; sub: string; right: React.ReactNode; icon?: React.ReactNode }) => (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <View style={styles.textContainer}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSub}>{sub}</Text>
        </View>
      </View>
  <View>{(typeof right === 'string' || typeof right === 'number') ? <Text>{right}</Text> : right}</View>
    </View>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View style={styles.header}>
        <SettingsIcon size={24} color="#4f46e5" />
        <Text style={styles.h1}>System Settings</Text>
        {loading && (
          <View style={{ marginLeft: 'auto' }}>
            <Text style={{ color: '#6b7280', fontSize: 14 }}>Loading...</Text>
          </View>
        )}
      </View>
      <ScrollView 
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={true}
        style={{ flex: 1 }}
      >
        {/* Settings Overview */}
        <View style={[styles.card, { marginBottom: 16, backgroundColor: '#f0f9ff' }]}>
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1e40af', marginBottom: 8 }}>
              📋 Settings Overview
            </Text>
            <Text style={{ color: '#374151', fontSize: 14, lineHeight: 20 }}>
              • 🛡️ Content Moderation (4 settings){'\n'}
              • 👥 User Permissions (3 settings){'\n'}
              • 📝 Content Settings (2 settings) ← You're looking for this!{'\n'}
              • ⚙️ System Features (3 settings){'\n'}
              • 🔧 Advanced Options (1 section)
            </Text>
            <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>
              💡 Scroll down to see all sections
            </Text>
          </View>
        </View>
        <Section title="🛡️ Content Moderation">
          <Row
            title="Auto-approve Verified Users"
            sub="Deals from verified users go live instantly without manual approval"
            icon={<Shield size={20} color="#10b981" />}
            right={
              <Switch
                value={s.auto_approve_verified}
                onValueChange={(v) => { setS({ ...s, auto_approve_verified: v }); saveKey('auto_approve_verified', v, 'bool'); }}
                disabled={loading}
              />
            }
          />

          <Row
            title="Require Moderation for New Deals"
            sub="All new deals require manual approval before going live"
            icon={<Shield size={20} color="#f59e0b" />}
            right={
              <Switch
                value={s.require_moderation_new_deals}
                onValueChange={(v) => { setS({ ...s, require_moderation_new_deals: v }); saveKey('require_moderation_new_deals', v, 'bool'); }}
                disabled={loading}
              />
            }
          />

          <Row
            title="Enable User Reports"
            sub="Allow users to report inappropriate content and users"
            icon={<MessageSquare size={20} color="#ef4444" />}
            right={
              <Switch
                value={s.enable_user_reports}
                onValueChange={(v) => { setS({ ...s, enable_user_reports: v }); saveKey('enable_user_reports', v, 'bool'); }}
                disabled={loading}
              />
            }
          />

          <Row
            title="Auto-ban Threshold"
            sub="Number of reports before user is automatically banned"
            icon={<Shield size={20} color="#ef4444" />}
            right={
              <TextInput
                keyboardType="numeric"
                value={String(s.auto_ban_threshold)}
                onChangeText={(t) => {
                  const num = Math.max(1, Math.min(50, Number(t) || 1));
                  setS({ ...s, auto_ban_threshold: num });
                  saveKey('auto_ban_threshold', num, 'number');
                }}
                style={styles.numInput}
                editable={!loading}
              />
            }
          />
        </Section>

        <Section title="👥 User Permissions">
          <Row
            title="Allow Guest Posting"
            sub="Guests can submit deals without creating an account"
            icon={<Users size={20} color="#6366f1" />}
            right={
              <Switch
                value={s.allow_guest_posting}
                onValueChange={(v) => { setS({ ...s, allow_guest_posting: v }); saveKey('allow_guest_posting', v, 'bool'); }}
                disabled={loading}
              />
            }
          />

          <Row
            title="Max Daily Posts per User"
            sub="Maximum number of deals a user can post in 24 hours"
            icon={<Clock size={20} color="#8b5cf6" />}
            right={
              <TextInput
                keyboardType="numeric"
                value={String(s.max_daily_posts_per_user)}
                onChangeText={(t) => {
                  const num = Math.max(1, Math.min(999, Number(t) || 1));
                  setS({ ...s, max_daily_posts_per_user: num });
                  saveKey('max_daily_posts_per_user', num, 'number');
                }}
                style={styles.numInput}
                editable={!loading}
              />
            }
          />

          <Row
            title="Min Reputation to Post"
            sub="Minimum reputation score required to submit deals"
            icon={<Star size={20} color="#f59e0b" />}
            right={
              <TextInput
                keyboardType="numeric"
                value={String(s.min_reputation_to_post)}
                onChangeText={(t) => {
                  const num = Math.max(0, Math.min(10000, Number(t) || 0));
                  setS({ ...s, min_reputation_to_post: num });
                  saveKey('min_reputation_to_post', num, 'number');
                }}
                style={styles.numInput}
                editable={!loading}
              />
            }
          />
        </Section>

        {/* Scroll indicator */}
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text style={{ color: '#9ca3af', fontSize: 12 }}>📝 Content Settings below ⬇️</Text>
        </View>

        <Section title="📝 Content Settings">
          <Row
            title="Max Comment Length"
            sub="Maximum number of characters allowed in comments (currently allows up to 500 chars)"
            icon={<MessageSquare size={20} color="#06b6d4" />}
            right={
              <View style={{ alignItems: 'center' }}>
                <TextInput
                  keyboardType="numeric"
                  value={String(s.max_comment_length)}
                  onChangeText={(t) => {
                    const num = Math.max(50, Math.min(2000, Number(t) || 500));
                    setS({ ...s, max_comment_length: num });
                    saveKey('max_comment_length', num, 'number');
                  }}
                  style={styles.numInput}
                  editable={!loading}
                />
                <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>50-2000</Text>
              </View>
            }
          />

          <Row
            title="Deal Expiry Days"
            sub="Number of days before deals automatically expire and are hidden from users"
            icon={<Clock size={20} color="#f97316" />}
            right={
              <View style={{ alignItems: 'center' }}>
                <TextInput
                  keyboardType="numeric"
                  value={String(s.deal_expiry_days)}
                  onChangeText={(t) => {
                    const num = Math.max(1, Math.min(365, Number(t) || 30));
                    setS({ ...s, deal_expiry_days: num });
                    saveKey('deal_expiry_days', num, 'number');
                  }}
                  style={styles.numInput}
                  editable={!loading}
                />
                <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>1-365</Text>
              </View>
            }
          />
        </Section>

        {/* Scroll indicator */}
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text style={{ color: '#9ca3af', fontSize: 12 }}>⚙️ System Features below ⬇️</Text>
        </View>

        <Section title="⚙️ System Features">
          <Row
            title="Push Notifications"
            sub="Enable push notifications for important app events"
            icon={<Bell size={20} color="#8b5cf6" />}
            right={
              <Switch
                value={s.enable_push_notifications}
                onValueChange={(v) => { setS({ ...s, enable_push_notifications: v }); saveKey('enable_push_notifications', v, 'bool'); }}
                disabled={loading}
              />
            }
          />

          <Row
            title="Location Verification"
            sub="Require location verification for posting deals"
            icon={<Globe size={20} color="#10b981" />}
            right={
              <Switch
                value={s.enable_location_verification}
                onValueChange={(v) => { setS({ ...s, enable_location_verification: v }); saveKey('enable_location_verification', v, 'bool'); }}
                disabled={loading}
              />
            }
          />

          <Row
            title="⚠️ Maintenance Mode"
            sub="Put the app in maintenance mode for all users"
            icon={<SettingsIcon size={20} color="#ef4444" />}
            right={
              <Switch
                value={s.maintenance_mode}
                onValueChange={(v) => { 
                  Alert.alert(
                    'Maintenance Mode', 
                    v ? '⚠️ This will make the app unavailable to ALL USERS. Only admins will be able to access the app. Are you sure?' : '✅ This will make the app available again to all users. Continue?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: v ? 'Enable Maintenance' : 'Disable Maintenance', 
                        style: v ? 'destructive' : 'default',
                        onPress: () => {
                          setS({ ...s, maintenance_mode: v }); 
                          saveKey('maintenance_mode', v, 'bool');
                        }
                      }
                    ]
                  );
                }}
                disabled={loading}
              />
            }
          />
        </Section>

        <Section title="🔧 Advanced Options">
          <TouchableOpacity
            style={[styles.row, { backgroundColor: '#fef3c7' }]}
            onPress={() => Alert.alert('Coming Soon', 'Cache management, API rate limits, and advanced monitoring tools will be available in the next update.')}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconContainer}>
                <SettingsIcon size={20} color="#f59e0b" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.rowTitle}>Advanced Settings</Text>
                <Text style={styles.rowSub}>Cache management, rate limits, API configuration</Text>
              </View>
            </View>
            <Text style={{ color: '#f59e0b', fontSize: 14, fontWeight: '500' }}>Coming Soon</Text>
          </TouchableOpacity>
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20, 
    paddingTop: 20, 
    paddingBottom: 16, 
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  h1: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#1e293b',
    marginLeft: 12
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  card: { 
    backgroundColor: '#ffffff', 
    borderRadius: 12, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f1f5f9' 
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  textContainer: {
    flex: 1,
  },
  rowTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#111827' 
  },
  rowSub: { 
    color: '#6b7280', 
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
  },
  numInput: { 
    width: 80, 
    backgroundColor: '#fff', 
    borderColor: '#d1d5db', 
    borderWidth: 1, 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});
