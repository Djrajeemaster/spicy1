
// app/(tabs)/following.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthProvider';
import { followService } from '@/services/followService';
import { userService } from '@/services/userService';
import { storeService } from '@/services/storeService';
import { DealCard } from '@/components/DealCard';

export default function FollowingScreen() {
  const { user } = useAuth();
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [feed, setFeed] = useState<any[]>([]);

  const [discoverUsers, setDiscoverUsers] = useState<any[]>([]);
  const [discoverStores, setDiscoverStores] = useState<any[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      setLoadingFeed(true);
      const { data } = await followService.getFollowingFeed(30, 0);
      setFeed(Array.isArray(data) ? data : []);
      setLoadingFeed(false);
    })();
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (query.length < 1) {
        setDiscoverUsers([]);
        const stores = await storeService.getStores();
        if (active) setDiscoverStores(stores.data?.slice(0, 8) ?? []);
        return;
      }
      const { data: users } = await userService.searchByUsernamePrefix(query, 8);
      if (active) setDiscoverUsers(users ?? []);
    })();
    return () => { active = false; };
  }, [query]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Following</Text>
          <Text style={styles.subtitleText}>Follow users and stores to see deals here.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discover</Text>
          <TextInput
            placeholder="Search users..."
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={setQuery}
            style={styles.input}
          />

          {discoverUsers.length > 0 && (
            <View style={styles.pillsWrap}>
              {discoverUsers.map(u => (
                <View key={u.id} style={styles.pill}>
                  <Text style={styles.pillText}>@{u.username}</Text>
                  <TouchableOpacity
                    onPress={() => followService.followUser(u.id)}
                    style={styles.actionBtn}
                  >
                    <Text style={styles.actionBtnText}>Follow</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stores</Text>
          {discoverStores.length === 0 ? (
            <Text style={styles.muted}>No stores found.</Text>
          ) : (
            <View style={styles.pillsWrap}>
              {discoverStores.map(s => (
                <View key={s.id} style={styles.pill}>
                  <Text style={styles.pillText}>{s.name}</Text>
                  <TouchableOpacity
                    onPress={() => followService.followStore(s.id)}
                    style={styles.actionBtn}
                  >
                    <Text style={styles.actionBtnText}>Follow</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Following Feed</Text>
          {loadingFeed ? (
            <ActivityIndicator />
          ) : feed.length === 0 ? (
            <Text style={styles.muted}>Nothing yet. Once you follow people/stores, their new deals appear here.</Text>
          ) : (
            feed.map((d, i) => (
              <View key={d.id ?? i} style={{ marginBottom: 12 }}>
                <DealCard deal={{
                  ...d,
                  store: { id: d.store_id, name: d.store_name, slug: d.store_slug, logo_url: d.store_logo_url, verified: d.store_verified },
                  category: { id: d.category_id, name: d.category_name, emoji: d.category_emoji },
                  created_by_user: d.created_by_id ? { id: d.created_by_id, username: d.created_by_username, role: d.created_by_role, reputation: d.created_by_reputation } : null,
                }} />
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // App base look & feel (matches Header/DealCard palette)
  safe: { flex: 1, backgroundColor: '#ffffff' },
  container: { paddingHorizontal: 16, paddingVertical: 12 },
  header: { marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitleText: { marginTop: 4, color: '#6b7280' },

  section: { marginTop: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1f2937', marginBottom: 10 },

  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#fff', fontSize: 14, color: '#111827'
  },

  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 999, backgroundColor: '#f9fafb'
  },
  pillText: { color: '#1f2937', fontWeight: '600' },

  actionBtn: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
    borderWidth: 1, borderColor: '#1e293b', backgroundColor: '#1e293b'
  },
  actionBtnText: { color: '#ffffff', fontWeight: '800' },

  muted: { color: '#6b7280' },
});
