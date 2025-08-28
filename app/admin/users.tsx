import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { Search, ShieldCheck, UserPlus, UserMinus, User, MoreVertical, Ban, Clock, CheckSquare, Square, Users } from 'lucide-react-native';
import { listUsers, setUserRole } from '@/services/admin/adminRoles';
import { startImpersonation, stopImpersonation } from '@/services/admin/impersonationService';
import { elevate } from '@/services/adminElevation';
import { adminUserService } from '@/services/adminUserService';
import UserDetailModal from '@/components/admin/UserDetailModal';
import BulkActionModal from '@/components/admin/BulkActionModal';

type Item = { 
  id: string; 
  username?: string; 
  email?: string; 
  role: string; 
  created_at: string;
  status?: string;
  is_banned?: boolean;
  is_suspended?: boolean;
  ban_expiry?: string;
  suspend_expiry?: string;
};

const ROLES = ['user','verified_user','business','moderator','admin','super_admin'] as const;

export default function AdminUsers() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState<string>('');
  const [items, setItems] = useState<Item[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [impTokens, setImpTokens] = useState<Record<string, string>>({});
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkActionVisible, setBulkActionVisible] = useState(false);

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
      const elevation = await elevate(10);
      await setUserRole(userId, nextRole, elevation.token);
      setItems(prev => prev.map(i => i.id === userId ? { ...i, role: nextRole } : i));
      Alert.alert('Success', 'User role updated successfully');
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

  const openUserDetail = (userId: string) => {
    setSelectedUser(userId);
    setUserDetailVisible(true);
  };

  const quickBanUser = async (userId: string) => {
    Alert.alert(
      'Ban User',
      'Are you sure you want to ban this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban',
          style: 'destructive',
          onPress: async () => {
            try {
              const elevation = await elevate(10);
              await adminUserService.banUser({
                userId,
                elevationToken: elevation.token,
                banReason: 'Quick ban from admin panel',
              });
              Alert.alert('Success', 'User has been banned');
              load(true);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to ban user');
            }
          },
        },
      ]
    );
  };

  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
    setSelectedUsers(new Set());
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const selectAllUsers = () => {
    const allUserIds = new Set(items.map(item => item.id));
    setSelectedUsers(allUserIds);
  };

  const clearSelection = () => {
    setSelectedUsers(new Set());
  };

  const renderItem = ({ item }: { item: Item }) => {
    const token = impTokens[item.id];
    const isBanned = item.is_banned || item.status === 'banned';
    const isSuspended = item.is_suspended || item.status === 'suspended';
    const isSelected = selectedUsers.has(item.id);
    
    return (
      <View style={s.card}>
        <View style={s.rowBetween}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {bulkMode && (
              <TouchableOpacity onPress={() => toggleUserSelection(item.id)}>
                {isSelected ? (
                  <CheckSquare size={20} color="#4f46e5" />
                ) : (
                  <Square size={20} color="#6b7280" />
                )}
              </TouchableOpacity>
            )}
            <ShieldCheck size={16} color="#0ea5e9" />
            <Text style={s.cardTitle}>{item.username || item.email || item.id.slice(0, 6)}</Text>
            {isBanned && <Ban size={14} color="#ef4444" />}
            {isSuspended && <Clock size={14} color="#f59e0b" />}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[s.rolePill, isBanned && s.rolePillBanned, isSuspended && s.rolePillSuspended]}>
              {isBanned ? 'BANNED' : isSuspended ? 'SUSPENDED' : item.role}
            </Text>
            {!bulkMode && (
              <TouchableOpacity onPress={() => openUserDetail(item.id)} style={s.moreBtn}>
                <MoreVertical size={16} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={s.sub}>{item.email || '—'}</Text>

        {!bulkMode && (
          <>
            <View style={s.rowWrap}>
              {ROLES.map(r => (
                <TouchableOpacity 
                  key={r} 
                  style={[s.chip, r === item.role && s.chipOn, (isBanned || isSuspended) && s.chipDisabled]} 
                  onPress={() => !isBanned && !isSuspended && changeRole(item.id, r)}
                  disabled={isBanned || isSuspended}
                >
                  <Text style={[s.chipTxt, r === item.role && s.chipTxtOn]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.rowWrap}>
              {!token ? (
                <TouchableOpacity 
                  style={[s.btnLite, (isBanned || isSuspended) && s.btnDisabled]} 
                  onPress={() => !isBanned && !isSuspended && doImpersonate(item.id)}
                  disabled={isBanned || isSuspended}
                >
                  <UserPlus size={14} color={isBanned || isSuspended ? "#9ca3af" : "#111827"} />
                  <Text style={[s.btnLiteTxt, (isBanned || isSuspended) && s.btnTxtDisabled]}>
                    Start impersonation
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.btnWarn} onPress={() => stopImp(item.id)}>
                  <UserMinus size={14} color="#991b1b" />
                  <Text style={s.btnWarnTxt}>Stop impersonation</Text>
                </TouchableOpacity>
              )}

              {!isBanned && (
                <TouchableOpacity style={s.btnDanger} onPress={() => quickBanUser(item.id)}>
                  <Ban size={14} color="#fff" />
                  <Text style={s.btnDangerTxt}>Quick Ban</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={s.btnPrimary} onPress={() => openUserDetail(item.id)}>
                <User size={14} color="#fff" />
                <Text style={s.btnPrimaryTxt}>Details</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
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

        <View style={s.bulkControls}>
          <TouchableOpacity 
            style={[s.bulkBtn, bulkMode && s.bulkBtnActive]} 
            onPress={toggleBulkMode}
          >
            <Users size={16} color={bulkMode ? "#fff" : "#4f46e5"} />
            <Text style={[s.bulkBtnTxt, bulkMode && s.bulkBtnTxtActive]}>
              {bulkMode ? 'Exit Bulk' : 'Bulk Mode'}
            </Text>
          </TouchableOpacity>

          {bulkMode && (
            <>
              <TouchableOpacity style={s.bulkSelectBtn} onPress={selectAllUsers}>
                <Text style={s.bulkSelectBtnTxt}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.bulkSelectBtn} onPress={clearSelection}>
                <Text style={s.bulkSelectBtnTxt}>Clear</Text>
              </TouchableOpacity>
              {selectedUsers.size > 0 && (
                <TouchableOpacity 
                  style={s.bulkActionBtn} 
                  onPress={() => setBulkActionVisible(true)}
                >
                  <Text style={s.bulkActionBtnTxt}>
                    Actions ({selectedUsers.size})
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
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
        
        {bulkMode && selectedUsers.size > 0 && (
          <Text style={s.bulkSelectionInfo}>
            {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
          </Text>
        )}
      </View>

      {selectedUser && (
        <UserDetailModal
          visible={userDetailVisible}
          onClose={() => {
            setUserDetailVisible(false);
            setSelectedUser(null);
          }}
          userId={selectedUser}
          onUserUpdated={() => load(true)}
        />
      )}

      <BulkActionModal
        visible={bulkActionVisible}
        onClose={() => setBulkActionVisible(false)}
        selectedUserIds={Array.from(selectedUsers)}
        onActionComplete={() => {
          load(true);
          setSelectedUsers(new Set());
          setBulkActionVisible(false);
        }}
      />
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
  rolePillBanned: { backgroundColor: '#fee2e2', color: '#dc2626' },
  rolePillSuspended: { backgroundColor: '#fef3c7', color: '#d97706' },
  sub: { color: '#6b7280', marginTop: 4, marginBottom: 8 },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },

  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  chipOn: { backgroundColor: '#111827', borderColor: '#111827' },
  chipDisabled: { backgroundColor: '#f3f4f6', borderColor: '#d1d5db', opacity: 0.6 },
  chipTxt: { color: '#111827', fontWeight: '700' },
  chipTxtOn: { color: '#fff' },

  btnLite: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  btnLiteTxt: { color: '#111827', fontWeight: '800' },
  btnDisabled: { opacity: 0.5 },
  btnTxtDisabled: { color: '#9ca3af' },
  btnWarn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' },
  btnWarnTxt: { color: '#991b1b', fontWeight: '800' },
  btnDanger: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnDangerTxt: { color: '#fff', fontWeight: '800' },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnPrimaryTxt: { color: '#fff', fontWeight: '800' },
  moreBtn: { padding: 4, borderRadius: 4 },

  footer: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#e5e7eb' },

  bulkControls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 8 },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#4f46e5', backgroundColor: '#fff' },
  bulkBtnActive: { backgroundColor: '#4f46e5' },
  bulkBtnTxt: { color: '#4f46e5', fontWeight: '600', fontSize: 14 },
  bulkBtnTxtActive: { color: '#fff' },
  bulkSelectBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  bulkSelectBtnTxt: { color: '#374151', fontWeight: '600', fontSize: 12 },
  bulkActionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#ef4444' },
  bulkActionBtnTxt: { color: '#fff', fontWeight: '600', fontSize: 14 },
  bulkSelectionInfo: { color: '#6b7280', fontSize: 12, marginTop: 4 },
});
