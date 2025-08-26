import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { Search, ShieldCheck, UserPlus, UserMinus } from 'lucide-react-native';
import { listUsers, setUserRole } from '@/services/admin/adminRoles';
import { startImpersonation, stopImpersonation } from '@/services/admin/impersonationService';

type Item = { id: string; username?: string; email?: string; role: string; created_at: string };

const ROLES = ['user','verified_user','business','moderator','admin','super_admin'] as const;

export default function AdminUsers() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState<string>('');
  const [items, setItems] = useState<Item[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [impTokens, setImpTokens] = useState<Record<string, string>>({});

  const load = async (reset=false) => {
    try {
      setLoading(true);
      const res = await listUsers({ q, role: role || undefined, limit: 30, cursor: reset ? undefined : cursor || undefined });
      setItems((prev) => reset ? res.items : [...prev, ...res.items]);
      setCursor(res.next_cursor ?? null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(true); }, [role]);

  const onSearch = () => load(true);

  const changeRole = async (userId: string, nextRole: string) => {
    try {
      await setUserRole(userId, nextRole);
      setItems(prev => prev.map(i => i.id === userId ? { ...i, role: nextRole } : i));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to set role');
    }
  };

  const doImpersonate = async (userId: string) => {
    try {
      const res = await startImpersonation(userId);
      setImpTokens(prev => ({ ...prev, [userId]: res.token }));
      Alert.alert('Impersonation', 'Session started for this user.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to start impersonation');
    }
  };

  const stopImp = async (userId?: string) => {
    try {
      await stopImpersonation(userId);
      setImpTokens(prev => {
        if (!userId) return {};
        const cp = { ...prev }; delete cp[userId]; return cp;
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to stop impersonation');
    }
  };

  const renderItem = ({ item }: { item: Item }) => {
    const token = impTokens[item.id];
    return (
      <View style={s.card}>
        <View style={s.rowBetween}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={16} color="#0ea5e9" />
            <Text style={s.cardTitle}>{item.username || item.email || item.id.slice(0, 6)}</Text>
          </View>
          <Text style={s.rolePill}>{item.role}</Text>
        </View>

        <Text style={s.sub}>{item.email || '—'}</Text>

        <View style={s.rowWrap}>
          {ROLES.map(r => (
            <TouchableOpacity key={r} style={[s.chip, r === item.role && s.chipOn]} onPress={() => changeRole(item.id, r)}>
              <Text style={[s.chipTxt, r === item.role && s.chipTxtOn]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.rowWrap}>
          {!token ? (
            <TouchableOpacity style={s.btnLite} onPress={() => doImpersonate(item.id)}>
              <UserPlus size={14} color="#111827" />
              <Text style={s.btnLiteTxt}>Start impersonation</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.btnWarn} onPress={() => stopImp(item.id)}>
              <UserMinus size={14} color="#991b1b" />
              <Text style={s.btnWarnTxt}>Stop impersonation</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}>
        <Text style={s.h1}>Users</Text>
      </View>

      <View style={s.toolbar}>
        <View style={s.searchWrap}>
          <Search size={14} color="#64748b" />
          <TextInput
            placeholder="Search username/email…"
            placeholderTextColor="#94a3b8"
            value={q}
            onChangeText={setQ}
            onSubmitEditing={onSearch}
            style={s.input}
          />
          <TouchableOpacity style={s.btn} onPress={onSearch}>
            <Text style={s.btnTxt}>Search</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.label}>Filter by role</Text>
        <View style={s.rowWrap}>
          {['', ...ROLES].map(r => (
            <TouchableOpacity key={r || 'all'} style={[s.chip, r === role && s.chipOn]} onPress={() => setRole(r)}>
              <Text style={[s.chipTxt, r === role && s.chipTxtOn]}>{r || 'all'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        onEndReached={() => cursor && !loading && load(false)}
        onEndReachedThreshold={0.3}
        refreshing={loading}
        onRefresh={() => load(true)}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      />

      <View style={s.footer}>
        <TouchableOpacity style={s.btnLite} onPress={() => stopImp()}>
          <Text style={s.btnLiteTxt}>Stop all impersonation</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, backgroundColor: '#0b1220' },
  h1: { fontSize: 22, fontWeight: '800', color: '#fff' },

  toolbar: { padding: 16, backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, backgroundColor: '#fff', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  btn: { backgroundColor: '#4f46e5', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  btnTxt: { color: '#fff', fontWeight: '800' },
  label: { color: '#6b7280', marginTop: 10, marginBottom: 6 },

  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  rolePill: { backgroundColor: '#eef2ff', color: '#4338ca', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, fontWeight: '800' },
  sub: { color: '#6b7280', marginTop: 4, marginBottom: 8 },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },

  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  chipOn: { backgroundColor: '#111827', borderColor: '#111827' },
  chipTxt: { color: '#111827', fontWeight: '700' },
  chipTxtOn: { color: '#fff' },

  btnLite: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  btnLiteTxt: { color: '#111827', fontWeight: '800' },
  btnWarn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' },
  btnWarnTxt: { color: '#991b1b', fontWeight: '800' },

  footer: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
});
