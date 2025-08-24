import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { useAuth } from '@/contexts/AuthProvider';
import { alertService } from '@/services/alertService';
import { storeService } from '@/services/storeService';

type AlertType = 'keyword' | 'price_threshold' | 'store';
type StoreLite = { id: string; name: string };

export default function AlertsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stores, setStores] = useState<StoreLite[]>([]);
  const [expanded, setExpanded] = useState<boolean>(false);

  // form
  const [type, setType] = useState<AlertType>('keyword');
  const [keyword, setKeyword] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [storeId, setStoreId] = useState<string>('');

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      try {
        const [a, s] = await Promise.all([
          alertService.getUserAlerts(user.id),
          storeService.getStores()
        ]);
        setAlerts(a || []);
        setStores((s || []).map((x: any) => ({ id: x.id, name: x.name })));
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

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

    const created = await alertService.createAlert({
      user_id: user.id,
      type,
      rules: rulesPreview,
      is_active: true
    });
    setAlerts(prev => [created, ...(prev || [])]);
    setKeyword(''); setMaxPrice(''); setStoreId('');
  };

  const toggleActive = async (alertId: string, isActive: boolean) => {
    await alertService.updateAlert(alertId, { is_active: isActive });
    setAlerts(prev => (prev || []).map(a => a.id === alertId ? { ...a, is_active: isActive } : a));
  };

  if (loading) {
    return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><ActivityIndicator /></View>;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <TouchableOpacity onPress={() => setExpanded(x => !x)} style={{ flexDirection:'row', justifyContent:'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize:18, fontWeight:'700' }}>Create New Alert</Text>
        <Text>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={{ padding:12, borderWidth:1, borderColor:'#e5e7eb', borderRadius:10, marginBottom:16 }}>
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:8 }}>
            {(['keyword','price_threshold','store'] as AlertType[]).map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setType(t)}
                style={{
                  paddingHorizontal:12, paddingVertical:8, borderRadius:999,
                  borderWidth:1, borderColor: type===t ? '#111' : '#cbd5e1',
                  backgroundColor: type===t ? '#f3f4f6' : 'transparent'
                }}
              >
                <Text style={{ textTransform:'capitalize' }}>{t.replace('_',' ')}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {type !== 'store' && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontWeight:'600' }}>Keyword</Text>
              <TextInput
                placeholder="e.g., gaming laptop"
                value={keyword}
                onChangeText={setKeyword}
                style={{ borderWidth:1, borderColor:'#e5e7eb', borderRadius:8, padding:10, marginTop:4 }}
              />
            </View>
          )}

          {type === 'price_threshold' && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontWeight:'600' }}>Max Price</Text>
              <TextInput
                keyboardType="numeric"
                placeholder="500"
                value={maxPrice}
                onChangeText={setMaxPrice}
                style={{ borderWidth:1, borderColor:'#e5e7eb', borderRadius:8, padding:10, marginTop:4 }}
              />
            </View>
          )}

          {type === 'store' && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontWeight:'600' }}>Store</Text>
              <View style={{ borderWidth:1, borderColor:'#e5e7eb', borderRadius:8, marginTop:4 }}>
                {stores.map(s => (
                  <TouchableOpacity key={s.id} onPress={() => setStoreId(s.id)} style={{ padding:10, backgroundColor: s.id===storeId ? '#f1f5f9' : 'transparent' }}>
                    <Text>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
            <TouchableOpacity onPress={onCreate} style={{ backgroundColor:'#111', paddingHorizontal:14, paddingVertical:10, borderRadius:10 }}>
              <Text style={{ color:'#fff', fontWeight:'700' }}>Create</Text>
            </TouchableOpacity>
            <Text style={{ fontSize:12, opacity:0.6 }}>Preview: {JSON.stringify(rulesPreview)}</Text>
          </View>
        </View>
      )}

      <Text style={{ fontSize:16, fontWeight:'700', marginBottom: 8 }}>Your Alerts</Text>
      {(alerts || []).length === 0 && <Text style={{ opacity:0.7 }}>No alerts yet.</Text>}
      {(alerts || []).map((a:any) => (
        <View key={a.id} style={{ padding:12, borderWidth:1, borderColor:'#f1f5f9', borderRadius:10, marginBottom:10 }}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
            <Text style={{ fontWeight:'700', textTransform:'capitalize' }}>{String(a.type || '').replace('_',' ')}</Text>
            <Switch value={!!a.is_active} onValueChange={(v)=>toggleActive(a.id, v)} />
          </View>
          <Text style={{ marginTop:6, opacity:0.8 }}>{JSON.stringify(a.rules || {})}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
