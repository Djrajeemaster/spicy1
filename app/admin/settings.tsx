import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TextInput, Alert, ScrollView } from 'react-native';
import { listConfig, upsertConfig } from '@/services/admin/flagsService';

type SettingKey =
  | 'auto_approve_verified'
  | 'require_moderation_new_deals'
  | 'allow_guest_posting'
  | 'max_daily_posts_per_user'
  | 'min_reputation_to_post';

type Settings = {
  auto_approve_verified: boolean;
  require_moderation_new_deals: boolean;
  allow_guest_posting: boolean;
  max_daily_posts_per_user: number;
  min_reputation_to_post: number;
};

const DEFAULTS: Settings = {
  auto_approve_verified: true,
  require_moderation_new_deals: true,
  allow_guest_posting: false,
  max_daily_posts_per_user: 10,
  min_reputation_to_post: 0,
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
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Unable to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveKey = async (key: SettingKey, value: any, type: 'bool'|'number') => {
    try { await upsertConfig(key, value, type); }
    catch (e: any) { Alert.alert('Error', e.message || 'Failed to save'); }
  };

  const Row = ({ title, sub, right }: { title: string; sub: string; right: React.ReactNode }) => (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <View>{right}</View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}><Text style={styles.h1}>System Settings</Text></View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.card}>
          <Row
            title="Auto-approve Verified Users"
            sub="Deals from verified users go live instantly."
            right={
              <Switch
                value={s.auto_approve_verified}
                onValueChange={(v) => { setS({ ...s, auto_approve_verified: v }); saveKey('auto_approve_verified', v, 'bool'); }}
              />
            }
          />

          <Row
            title="Require Moderation for New Deals"
            sub="All new deals require manual approval."
            right={
              <Switch
                value={s.require_moderation_new_deals}
                onValueChange={(v) => { setS({ ...s, require_moderation_new_deals: v }); saveKey('require_moderation_new_deals', v, 'bool'); }}
              />
            }
          />

          <Row
            title="Allow Guest Posting"
            sub="Guests can submit deals without an account."
            right={
              <Switch
                value={s.allow_guest_posting}
                onValueChange={(v) => { setS({ ...s, allow_guest_posting: v }); saveKey('allow_guest_posting', v, 'bool'); }}
              />
            }
          />

          <Row
            title="Max Daily Posts per User"
            sub="Limit on deals a user can post daily."
            right={
              <TextInput
                keyboardType="numeric"
                value={String(s.max_daily_posts_per_user)}
                onChangeText={(t) => {
                  const num = Math.max(0, Math.min(999, Number(t) || 0));
                  setS({ ...s, max_daily_posts_per_user: num });
                  saveKey('max_daily_posts_per_user', num, 'number');
                }}
                style={styles.numInput}
              />
            }
          />

          <Row
            title="Min Reputation to Post"
            sub="Minimum reputation score required to post deals."
            right={
              <TextInput
                keyboardType="numeric"
                value={String(s.min_reputation_to_post)}
                onChangeText={(t) => {
                  const num = Math.max(0, Math.min(100000, Number(t) || 0));
                  setS({ ...s, min_reputation_to_post: num });
                  saveKey('min_reputation_to_post', num, 'number');
                }}
                style={styles.numInput}
              />
            }
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, backgroundColor: '#0b1220' },
  h1: { fontSize: 22, fontWeight: '800', color: '#fff' },

  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  rowSub: { color: '#6b7280', marginTop: 4 },
  numInput: { width: 80, backgroundColor: '#fff', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, textAlign: 'center' },
});
