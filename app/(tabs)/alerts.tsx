import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthProvider';
import { useTheme } from '@/contexts/ThemeProvider';
import { alertService } from '@/services/alertService';
import { storeService } from '@/services/storeService';

type AlertType = 'keyword' | 'price_threshold' | 'store';
type StoreLite = { id: string; name: string };

export default function AlertsScreen() {
  const { user } = useAuth();
  const { theme, colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stores, setStores] = useState<StoreLite[]>([]);
  const [expanded, setExpanded] = useState<boolean>(false);

  // form
  const [type, setType] = useState<AlertType>('keyword');
  const [keyword, setKeyword] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [storeId, setStoreId] = useState<string>('');

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [alertsRes, storesRes] = await Promise.all([
        alertService.getUserAlerts(user.id),
        storeService.getStores()
      ]);
      setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
      setStores(Array.isArray(storesRes.data) ? storesRes.data.map((x: any) => ({ id: x.id, name: x.name })) : []);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh alerts when screen comes into focus - but only if data is stale
  const lastAlertsLoadRef = useRef(0);
  const ALERTS_RELOAD_THRESHOLD = 5 * 60 * 1000; // 5 minutes for alerts

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastLoad = now - lastAlertsLoadRef.current;
      
      // Only reload if data is stale
      if (timeSinceLastLoad > ALERTS_RELOAD_THRESHOLD) {
        console.log('🔄 Alerts: Reloading data on focus');
        loadData();
        lastAlertsLoadRef.current = now;
      } else {
        console.log('📱 Alerts: Skipping reload, data is fresh');
      }
    }, [loadData])
  );

  const rulesPreview = useMemo(() => {
    switch (type) {
      case 'keyword': return { keyword };
      case 'price_threshold': return { keyword, max_price: maxPrice ? Number(maxPrice) : undefined };
      case 'store': {
        const pick = stores.find(s => s.id === storeId);
        return pick ? { store_id: pick.id, store_name: pick.name } : {};
      }
    }
  }, [type, keyword, maxPrice, storeId, stores]);

  const onCreate = async () => {
    if (!user?.id) return;
    // minimal validation
    if (type === 'keyword' && !keyword.trim()) return;
    if (type === 'price_threshold' && (!keyword.trim() || !maxPrice.trim())) return;
    if (type === 'store' && !storeId) return;

    try {
      const { data: created } = await alertService.createAlert({
        user_id: user.id,
        type,
        rules: rulesPreview,
        is_active: true
      });
      if (created) setAlerts(prev => [created, ...(prev || [])]);
      setKeyword(''); setMaxPrice(''); setStoreId('');
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  };

  const toggleActive = async (alertId: string, isActive: boolean) => {
    try {
      await alertService.updateAlert(alertId, { is_active: isActive });
      setAlerts(prev => (prev || []).map(a => a.id === alertId ? { ...a, is_active: isActive } : a));
    } catch (error) {
      console.error('Error updating alert:', error);
    }
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#6366f1" /></View>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header />
      <ScrollView contentContainerStyle={[styles.content, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => setExpanded(x => !x)} style={[styles.expandButton, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Create New Alert</Text>
          <Text style={[styles.arrow, { color: colors.text }]}>{expanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {expanded && (
          <View style={styles.formContainer}>
            <View style={styles.typeButtons}>
              {(['keyword','price_threshold','store'] as AlertType[]).map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  style={[styles.typeButton, type===t && styles.typeButtonActive]}
                >
                  <Text style={styles.typeButtonText}>{t.replace('_',' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {type !== 'store' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Keyword</Text>
                <TextInput
                  placeholder="e.g., gaming laptop"
                  value={keyword}
                  onChangeText={setKeyword}
                  style={styles.input}
                />
              </View>
            )}

            {type === 'price_threshold' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Max Price</Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="500"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  style={styles.input}
                />
              </View>
            )}

            {type === 'store' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Store</Text>
                <View style={styles.storeList}>
                  {stores.map(s => (
                    <TouchableOpacity key={s.id} onPress={() => setStoreId(s.id)} style={[styles.storeItem, s.id===storeId && styles.storeItemActive]}>
                      <Text>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.createRow}>
              <TouchableOpacity onPress={onCreate} style={styles.createButton}>
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
              <Text style={styles.preview}>Preview: {JSON.stringify(rulesPreview)}</Text>
            </View>
          </View>
        )}

        <Text style={styles.alertsTitle}>Your Alerts</Text>
        {(alerts || []).length === 0 && <Text style={styles.noAlerts}>No alerts yet.</Text>}
        {(alerts || []).map((a:any) => (
          <View key={a.id} style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <Text style={styles.alertType}>{String(a.type || '').replace('_',' ')}</Text>
              <Switch value={!!a.is_active} onValueChange={(v)=>toggleActive(a.id, v)} />
            </View>
            <Text style={styles.alertRules}>{JSON.stringify(a.rules || {})}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  content: { padding: 20 },
  expandButton: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  title: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  arrow: { fontSize: 18, color: '#6366f1', fontWeight: '700' },
  formContainer: { padding: 20, backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  typeButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  typeButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  typeButtonActive: { borderColor: '#6366f1', backgroundColor: '#6366f1' },
  typeButtonText: { textTransform: 'capitalize', color: '#64748b', fontWeight: '600' },
  inputGroup: { marginBottom: 20 },
  label: { fontWeight: '700', color: '#1e293b', marginBottom: 8, fontSize: 16 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, fontSize: 16, backgroundColor: '#f8fafc' },
  storeList: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc' },
  storeItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  storeItemActive: { backgroundColor: '#6366f1' },
  createRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  createButton: { backgroundColor: '#10b981', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  createButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  preview: { fontSize: 12, color: '#64748b', flex: 1 },
  alertsTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 20 },
  noAlerts: { color: '#64748b', fontStyle: 'italic', textAlign: 'center', fontSize: 16 },
  alertCard: { padding: 20, backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alertType: { fontWeight: '700', textTransform: 'capitalize', color: '#1e293b', fontSize: 16 },
  alertRules: { marginTop: 12, color: '#64748b', fontSize: 14 }
});