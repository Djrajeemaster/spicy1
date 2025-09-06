import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  FlatList,
  Image,
  Modal,
} from 'react-native';
import { Settings, UserX, X, MessageSquare, Bell } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthProvider';

interface ChatPreferences {
  user_id: string;
  allow_private_messages: boolean;
  allow_group_invites: boolean;
  show_online_status: boolean;
  message_notifications: boolean;
}

interface BlockedUser {
  id: string;
  blocked_id: string;
  username: string;
  avatar_url?: string;
  created_at: string;
}

interface ChatSettingsScreenProps {
  visible: boolean;
  onClose: () => void;
}

const ChatSettingsScreen: React.FC<ChatSettingsScreenProps> = ({ visible, onClose }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<ChatPreferences | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && user) {
      loadPreferences();
      loadBlockedUsers();
    }
  }, [visible, user]);

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/chat/preferences', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch preferences');
      const data = await response.json();
      setPreferences(data);
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const loadBlockedUsers = async () => {
    try {
      const response = await fetch('/api/chat/blocked', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch blocked users');
      const data = await response.json();
      setBlockedUsers(data);
    } catch (error) {
      console.error('Error loading blocked users:', error);
    }
  };

  const updatePreference = async (key: keyof ChatPreferences, value: boolean) => {
    if (!preferences) return;

    try {
      setLoading(true);
      const updatedPreferences = { ...preferences, [key]: value };
      
      const response = await fetch('/api/chat/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedPreferences),
      });

      if (!response.ok) throw new Error('Failed to update preferences');
      
      const data = await response.json();
      setPreferences(data);
    } catch (error) {
      console.error('Error updating preferences:', error);
      Alert.alert('Error', 'Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  const unblockUser = async (userId: string, username: string) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`/api/chat/block/${userId}`, {
                method: 'DELETE',
                credentials: 'include',
              });

              if (!response.ok) throw new Error('Failed to unblock user');
              
              setBlockedUsers(prev => prev.filter(user => user.blocked_id !== userId));
              Alert.alert('Success', `${username} has been unblocked`);
            } catch (error) {
              console.error('Error unblocking user:', error);
              Alert.alert('Error', 'Failed to unblock user');
            }
          },
        },
      ]
    );
  };

  const renderBlockedUser = ({ item }: { item: BlockedUser }) => (
    <View style={styles.blockedUserItem}>
      <View style={styles.userInfo}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <UserX size={20} color="#6B7280" />
          </View>
        )}
        <Text style={styles.username}>{item.username}</Text>
      </View>
      <TouchableOpacity
        style={styles.unblockButton}
        onPress={() => unblockUser(item.blocked_id, item.username)}
      >
        <Text style={styles.unblockButtonText}>Unblock</Text>
      </TouchableOpacity>
    </View>
  );

  if (!preferences) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Chat Settings</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#059669" />
            </TouchableOpacity>
          </View>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat Settings</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#059669" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MessageSquare size={20} color="#059669" />
              <Text style={styles.sectionTitle}>Privacy Settings</Text>
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Allow Private Messages</Text>
                <Text style={styles.settingDescription}>
                  Let other users send you private messages
                </Text>
              </View>
              <Switch
                value={preferences.allow_private_messages}
                onValueChange={(value) => updatePreference('allow_private_messages', value)}
                disabled={loading}
                trackColor={{ false: '#E5E7EB', true: '#059669' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Allow Group Invites</Text>
                <Text style={styles.settingDescription}>
                  Let other users invite you to group chats
                </Text>
              </View>
              <Switch
                value={preferences.allow_group_invites}
                onValueChange={(value) => updatePreference('allow_group_invites', value)}
                disabled={loading}
                trackColor={{ false: '#E5E7EB', true: '#059669' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Show Online Status</Text>
                <Text style={styles.settingDescription}>
                  Let others see when you're online
                </Text>
              </View>
              <Switch
                value={preferences.show_online_status}
                onValueChange={(value) => updatePreference('show_online_status', value)}
                disabled={loading}
                trackColor={{ false: '#E5E7EB', true: '#059669' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Bell size={20} color="#059669" />
              <Text style={styles.sectionTitle}>Notification Settings</Text>
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Message Notifications</Text>
                <Text style={styles.settingDescription}>
                  Get notified when you receive new messages
                </Text>
              </View>
              <Switch
                value={preferences.message_notifications}
                onValueChange={(value) => updatePreference('message_notifications', value)}
                disabled={loading}
                trackColor={{ false: '#E5E7EB', true: '#059669' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <UserX size={20} color="#EF4444" />
              <Text style={styles.sectionTitle}>Blocked Users</Text>
            </View>
            
            {blockedUsers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No blocked users</Text>
                <Text style={styles.emptySubtext}>
                  Users you block will appear here
                </Text>
              </View>
            ) : (
              <FlatList
                data={blockedUsers}
                keyExtractor={(item) => item.id}
                renderItem={renderBlockedUser}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    margin: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  blockedUserItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  unblockButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
  },
  unblockButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});

export default ChatSettingsScreen;
