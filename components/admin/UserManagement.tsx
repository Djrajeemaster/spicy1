import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Plus, Ban, CircleCheck as CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserBadge } from '@/components/UserBadge';
import { AdminUser } from '@/hooks/useAdminData';

interface UserManagementProps {
  users: AdminUser[];
  onUserAction: (userId: string, action: 'Ban' | 'Unban') => void;
}

interface UserItemProps {
  user: AdminUser;
  onUserAction: (userId: string, action: 'Ban' | 'Unban') => void;
}

const UserItem: React.FC<UserItemProps> = React.memo(({ user, onUserAction }) => {
  const handleAction = () => {
    onUserAction(user.id, user.status === 'active' ? 'Ban' : 'Unban');
  };

  return (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
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
            {user.username[0].toUpperCase()}
          </Text>
        </LinearGradient>
        
        <View style={styles.userDetails}>
          <View style={styles.userNameContainer}>
            <Text style={styles.userName}>{user.username}</Text>
          </View>
          <View style={styles.userBadgeContainer}>
            <UserBadge role={user.role} size="small" />
          </View>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Text style={styles.userStats}>
            {user.totalPosts} posts • {user.reputation}★ rating
          </Text>
        </View>
      </View>
      
      <View style={styles.userActions}>
        <View style={[
          styles.statusBadge, 
          user.status === 'active' ? styles.statusActive : styles.statusBanned
        ]}>
          <Text style={[
            styles.statusText, 
            user.status === 'active' ? styles.statusTextActive : styles.statusTextBanned
          ]}>
            {user.status}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.actionIcon}
          onPress={handleAction}
          accessibilityRole="button"
          accessibilityLabel={`${user.status === 'active' ? 'Ban' : 'Unban'} ${user.username}`}
        >
          {user.status === 'active' ? 
            <Ban size={18} color="#ef4444" /> : 
            <CheckCircle size={18} color="#10b981" />
          }
        </TouchableOpacity>
      </View>
    </View>
  );
});

UserItem.displayName = 'UserItem';

export const UserManagement: React.FC<UserManagementProps> = ({ users, onUserAction }) => {
  const renderUser = ({ item }: { item: AdminUser }) => (
    <UserItem user={item} onUserAction={onUserAction} />
  );

  const keyExtractor = (item: AdminUser) => item.id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>User Management</Text>
        <TouchableOpacity 
          style={styles.addButton}
          accessibilityRole="button"
          accessibilityLabel="Add new user"
        >
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
  },
  addButton: {
    backgroundColor: '#10b981',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
  },
  userNameContainer: {
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  userBadgeContainer: {
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  userStats: {
    fontSize: 12,
    color: '#94a3b8',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusBanned: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#059669',
  },
  statusTextBanned: {
    color: '#dc2626',
  },
  actionIcon: {
    padding: 8,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});