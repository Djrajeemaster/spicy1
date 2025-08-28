import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { 
  Plus, 
  Ban, 
  CircleCheck as CheckCircle, 
  Search, 
  MoreVertical, 
  User, 
  Clock, 
  CheckSquare, 
  Square, 
  Users,
  Shield,
  ShieldCheck
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { listUsers } from '@/services/admin/adminRoles';
import { adminUserService } from '@/services/adminUserService';
import { elevate } from '@/services/adminElevation';
import UserDetailModal from './UserDetailModal';
import BulkActionModal from './BulkActionModal';

interface UserManagementProps {
  users?: any[];
  onUserAction?: (userId: string, action: 'Ban' | 'Unban') => void;
  onAddUser?: () => void;
}

type ExtendedUser = {
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
  total_posts?: number;
  reputation?: number;
};

const ROLES = ['user', 'verified', 'business', 'moderator', 'admin', 'superadmin'] as const;

interface UserItemProps {
  user: ExtendedUser;
  onUserAction: (userId: string, action: 'Ban' | 'Unban') => void;
  onOpenDetail: (userId: string) => void;
  bulkMode: boolean;
  isSelected: boolean;
  onToggleSelection: (userId: string) => void;
}

const UserItem: React.FC<UserItemProps> = React.memo(({ 
  user, 
  onUserAction, 
  onOpenDetail, 
  bulkMode, 
  isSelected, 
  onToggleSelection 
}) => {
  const isBanned = user.is_banned || user.status === 'banned';
  const isSuspended = user.is_suspended || user.status === 'suspended';

  const handleAction = () => {
    onUserAction(user.id, isBanned ? 'Unban' : 'Ban');
  };

  return (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.userLeft}>
          {bulkMode && (
            <TouchableOpacity onPress={() => onToggleSelection(user.id)} style={styles.checkbox}>
              {isSelected ? (
                <CheckSquare size={20} color="#4f46e5" />
              ) : (
                <Square size={20} color="#6b7280" />
              )}
            </TouchableOpacity>
          )}
          
          <LinearGradient
            colors={
              user.role === 'superadmin' ? ['#dc2626', '#991b1b'] :
              user.role === 'admin' ? ['#ef4444', '#dc2626'] :
              user.role === 'moderator' ? ['#8b5cf6', '#7c3aed'] :
              user.role === 'business' ? ['#f59e0b', '#d97706'] :
              user.role === 'verified' ? ['#10b981', '#059669'] :
              ['#6366f1', '#4f46e5']
            }
            style={styles.userAvatar}
          >
            <Text style={styles.userAvatarText}>
              {(user.username || user.email || 'U')[0].toUpperCase()}
            </Text>
          </LinearGradient>
          
          <View style={styles.userDetails}>
            <View style={styles.userNameContainer}>
              <Text style={styles.userName}>{user.username || user.email || user.id.slice(0, 8)}</Text>
              {isBanned && <Ban size={14} color="#ef4444" />}
              {isSuspended && <Clock size={14} color="#f59e0b" />}
            </View>
            <Text style={styles.userEmail}>{user.email || '—'}</Text>
            <Text style={styles.userStats}>
              {user.total_posts || 0} posts • {user.reputation || 0}★ rating
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.userActions}>
        <View style={[
          styles.statusBadge, 
          isBanned ? styles.statusBanned : 
          isSuspended ? styles.statusSuspended : 
          styles.statusActive
        ]}>
          <Text style={[
            styles.statusText, 
            isBanned ? styles.statusTextBanned : 
            isSuspended ? styles.statusTextSuspended : 
            styles.statusTextActive
          ]}>
            {isBanned ? 'BANNED' : isSuspended ? 'SUSPENDED' : user.role}
          </Text>
        </View>
        
        {!bulkMode && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionIcon, styles.actionIconPrimary]}
              onPress={() => onOpenDetail(user.id)}
              accessibilityRole="button"
              accessibilityLabel={`View details for ${user.username}`}
            >
              <User size={16} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionIcon, isBanned ? styles.actionIconSuccess : styles.actionIconDanger]}
              onPress={handleAction}
              accessibilityRole="button"
              accessibilityLabel={`${isBanned ? 'Unban' : 'Ban'} ${user.username}`}
            >
              {isBanned ? 
                <CheckCircle size={16} color="#fff" /> : 
                <Ban size={16} color="#fff" />
              }
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
});

UserItem.displayName = 'UserItem';

export const UserManagement: React.FC<UserManagementProps> = ({ onAddUser }) => {
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [cursor, setCursor] = useState<string | null>(null);
  
  // Enhanced features
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkActionVisible, setBulkActionVisible] = useState(false);

  const loadUsers = async (reset = false) => {
    try {
      setLoading(true);
      const res = await listUsers({ 
        q: searchQuery, 
        role: roleFilter || undefined, 
        limit: 30, 
        cursor: reset ? undefined : cursor || undefined 
      });
      setUsers(prev => reset ? res.items : [...prev, ...res.items]);
      setCursor(res.next_cursor ?? null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(true);
  }, [roleFilter]);

  const handleSearch = () => {
    loadUsers(true);
  };

  const handleUserAction = async (userId: string, action: 'Ban' | 'Unban') => {
    try {
      const elevation = await elevate(10);
      
      if (action === 'Ban') {
        await adminUserService.banUser({
          userId,
          elevationToken: elevation.token,
          banReason: 'Quick ban from admin panel',
        });
        Alert.alert('Success', 'User has been banned');
      } else {
        await adminUserService.unbanUser({
          userId,
          elevationToken: elevation.token,
          reason: 'Unbanned from admin panel',
        });
        Alert.alert('Success', 'User has been unbanned');
      }
      
      loadUsers(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Action failed');
    }
  };

  const handleOpenDetail = (userId: string) => {
    setSelectedUser(userId);
    setUserDetailVisible(true);
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
    const allUserIds = new Set(users.map(user => user.id));
    setSelectedUsers(allUserIds);
  };

  const clearSelection = () => {
    setSelectedUsers(new Set());
  };

  const renderUser = ({ item }: { item: ExtendedUser }) => (
    <UserItem 
      user={item} 
      onUserAction={handleUserAction} 
      onOpenDetail={handleOpenDetail}
      bulkMode={bulkMode}
      isSelected={selectedUsers.has(item.id)}
      onToggleSelection={toggleUserSelection}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>User Management</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={onAddUser}
          accessibilityRole="button"
          accessibilityLabel="Add new user"
        >
          <Plus size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {/* Search and Filter Controls */}
      <View style={styles.controls}>
        <View style={styles.searchContainer}>
          <Search size={16} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Bulk Mode Controls */}
        <View style={styles.bulkControls}>
          <TouchableOpacity 
            style={[styles.bulkBtn, bulkMode && styles.bulkBtnActive]} 
            onPress={toggleBulkMode}
          >
            <Users size={16} color={bulkMode ? "#fff" : "#4f46e5"} />
            <Text style={[styles.bulkBtnTxt, bulkMode && styles.bulkBtnTxtActive]}>
              {bulkMode ? 'Exit Bulk' : 'Bulk Mode'}
            </Text>
          </TouchableOpacity>

          {bulkMode && (
            <>
              <TouchableOpacity style={styles.bulkSelectBtn} onPress={selectAllUsers}>
                <Text style={styles.bulkSelectBtnTxt}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bulkSelectBtn} onPress={clearSelection}>
                <Text style={styles.bulkSelectBtnTxt}>Clear</Text>
              </TouchableOpacity>
              {selectedUsers.size > 0 && (
                <TouchableOpacity 
                  style={styles.bulkActionBtn} 
                  onPress={() => setBulkActionVisible(true)}
                >
                  <Text style={styles.bulkActionBtnTxt}>
                    Actions ({selectedUsers.size})
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Role Filter */}
        <Text style={styles.filterLabel}>Filter by role</Text>
        <View style={styles.roleFilters}>
          {['', ...ROLES].map(role => (
            <TouchableOpacity 
              key={role || 'all'} 
              style={[styles.roleChip, role === roleFilter && styles.roleChipActive]} 
              onPress={() => setRoleFilter(role)}
            >
              <Text style={[styles.roleChipText, role === roleFilter && styles.roleChipTextActive]}>
                {role || 'all'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* User List */}
      {loading && users.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          onEndReached={() => cursor && !loading && loadUsers(false)}
          onEndReachedThreshold={0.3}
          refreshing={loading}
          onRefresh={() => loadUsers(true)}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bulk Selection Info */}
      {bulkMode && selectedUsers.size > 0 && (
        <View style={styles.bulkInfo}>
          <Text style={styles.bulkInfoText}>
            {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
          </Text>
        </View>
      )}

      {/* Modals */}
      {selectedUser && (
        <UserDetailModal
          visible={userDetailVisible}
          onClose={() => {
            setUserDetailVisible(false);
            setSelectedUser(null);
          }}
          userId={selectedUser}
          onUserUpdated={() => loadUsers(true)}
        />
      )}

      <BulkActionModal
        visible={bulkActionVisible}
        onClose={() => setBulkActionVisible(false)}
        selectedUserIds={Array.from(selectedUsers)}
        onActionComplete={() => {
          loadUsers(true);
          setSelectedUsers(new Set());
          setBulkActionVisible(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  controls: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#111827',
  },
  searchButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  bulkControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4f46e5',
    backgroundColor: '#fff',
  },
  bulkBtnActive: {
    backgroundColor: '#4f46e5',
  },
  bulkBtnTxt: {
    color: '#4f46e5',
    fontWeight: '600',
    fontSize: 14,
  },
  bulkBtnTxtActive: {
    color: '#fff',
  },
  bulkSelectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bulkSelectBtnTxt: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 12,
  },
  bulkActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#ef4444',
  },
  bulkActionBtnTxt: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  roleFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  roleChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  roleChipText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 12,
  },
  roleChipTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userInfo: {
    flex: 1,
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    marginRight: 12,
    padding: 4,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  userStats: {
    fontSize: 12,
    color: '#9ca3af',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#d1fae5',
  },
  statusBanned: {
    backgroundColor: '#fee2e2',
  },
  statusSuspended: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#065f46',
  },
  statusTextBanned: {
    color: '#991b1b',
  },
  statusTextSuspended: {
    color: '#92400e',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIcon: {
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconPrimary: {
    backgroundColor: '#4f46e5',
  },
  actionIconDanger: {
    backgroundColor: '#ef4444',
  },
  actionIconSuccess: {
    backgroundColor: '#10b981',
  },
  bulkInfo: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  bulkInfoText: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
  },
});