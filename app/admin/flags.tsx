import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, Switch } from 'react-native';
import { Plus } from 'lucide-react-native';
import { listFlags, upsertFlag, deleteFlag } from '@/services/admin/flagsService';

type Flag = { key: string; enabled: boolean; value: any; rollout: any; updated_by?: string; updated_at?: string };

export default function AdminFlags() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try { setLoading(true); const res = await listFlags(); setFlags(res.items || []); }
    catch (e: any) { Alert.alert('Error', e.message || 'Failed to load'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggle = async (f: Flag, enabled: boolean) => {
    try { await upsertFlag(f.key, { enabled }); setFlags(prev => prev.map(x => x.key === f.key ? { ...x, enabled } : x)); }
    catch (e: any) { Alert.alert('Error', e.message || 'Failed'); }
  };

  const save = async (f: Flag) => {
    try { await upsertFlag(f.key, { enabled: f.enabled, value: f.value, rollout: f.rollout }); Alert.alert('Saved', f.key); }
    catch (e: any) { Alert.alert('Error', e.message || 'Failed'); }
  };

  const remove = async (key: string) => {
    try { await deleteFlag(key); setFlags(prev => prev.filter(x => x.key !== key)); }
    catch (e: any) { Alert.alert('Error', e.message || 'Failed'); }
  };

  const addEmpty = () => setFlags(prev => [{ key: 'new_flag', enabled: false, value: {}, rollout: { percent: 0 } }, ...prev]);

  const Item = ({ item }: { item: Flag }) => (
    <View style={s.card}>
      <View style={s.rowBetween}>
        <TextInput value={item.key} onChangeText={(t) => { setFlags(prev => prev.map(x => x === item ? { ...x, key: t } : x)); }} style={s.keyInput} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={s.small}>Enabled</Text>
          <Switch value={item.enabled} onValueChange={(v) => toggle(item, v)} />
        </View>
      </View>

      <Text style={s.label}>Rollout %</Text>
      <TextInput
        keyboardType="numeric"
        value={String(item.rollout?.percent ?? 0)}
        onChangeText={(t) => {
          const num = Math.max(0, Math.min(100, Number(t) || 0));
          setFlags(prev => prev.map(x => x === item ? { ...x, rollout: { ...x.rollout, percent: num } } : x));
        }}
        style={s.input}
      />

      <Text style={s.label}>Value (JSON)</Text>
      <TextInput
        multiline
        value={JSON.stringify(item.value ?? {}, null, 2)}
        onChangeText={(t) => { try { const v = JSON.parse(t || '{}'); setFlags(prev => prev.map(x => x === item ? { ...x, value: v } : x)); } catch {} }}
        style={[s.input, { height: 120, fontFamily: 'monospace' }]}
      />

      <View style={s.row}>
        <TouchableOpacity style={s.btn} onPress={() => save(item)}><Text style={s.btnTxt}>Save</Text></TouchableOpacity>
        <TouchableOpacity style={s.btnWarn} onPress={() => remove(item.key)}><Text style={s.btnWarnTxt}>Delete</Text></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}><Text style={s.h1}>Feature Flags</Text></View>
      <View style={{ padding: 16 }}>
        <TouchableOpacity style={s.btnLite} onPress={addEmpty}>
          <Plus size={14} color="#111827" />
          <Text style={s.btnLiteTxt}>Add flag</Text>
        </TouchableOpacity>
        <FlatList
          data={flags}
          keyExtractor={(i) => i.key}
          renderItem={Item}
          refreshing={loading}
          onRefresh={load}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, backgroundColor: '#0b1220' },
  h1: { fontSize: 22, fontWeight: '800', color: '#fff' },

  small: { color: '#6b7280' },
  label: { color: '#6b7280', marginTop: 8, marginBottom: 4 },

  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  keyInput: { flex: 1, backgroundColor: '#fff', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginRight: 8 },
  input: { backgroundColor: '#fff', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  btn: { backgroundColor: '#4f46e5', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginRight: 8 },
  btnTxt: { color: '#fff', fontWeight: '800' },
  btnLite: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', alignSelf: 'flex-start' },
  btnLiteTxt: { color: '#111827', fontWeight: '800' },
  btnWarn: { backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' },
  btnWarnTxt: { color: '#991b1b', fontWeight: '800' },
});
