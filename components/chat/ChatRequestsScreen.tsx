import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  RefreshControl,
} from 'react-native';
import { MessageCircle, Check, X, Clock, UserX } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthProvider';

interface ChatRequest {
  id: string;
  sender_id: string;
  recipient_id: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'ignored';
  sender_username?: string;
  sender_avatar?: string;
  recipient_username?: string;
  recipient_avatar?: string;
  created_at: string;
  responded_at?: string;
}

interface ChatRequestsScreenProps {
  visible: boolean;
  onClose: () => void;
}

const ChatRequestsScreen: React.FC<ChatRequestsScreenProps> = ({ visible, onClose }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  useEffect(() => {
    if (visible && user) {
      loadRequests();
    }
  }, [visible, user, activeTab]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/chat/requests?type=${activeTab}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch requests');
      
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
      Alert.alert('Error', 'Failed to load chat requests');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (requestId: string, action: 'accept' | 'reject' | 'ignore') => {
    try {
      const response = await fetch(`/api/chat/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });

      if (!response.ok) throw new Error('Failed to respond to request');

      // Remove the request from the list or update its status
      setRequests(prev => prev.filter(req => req.id !== requestId));
      
      Alert.alert(
        'Success',
        action === 'accept' 
          ? 'Chat request accepted! You can now chat with this user.' 
          : `Chat request ${action}ed.`
      );
    } catch (error) {
      console.error('Error responding to request:', error);
      Alert.alert('Error', 'Failed to respond to request');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderRequest = ({ item }: { item: ChatRequest }) => {
    const isReceived = activeTab === 'received';
    const displayName = isReceived ? item.sender_username : item.recipient_username;
    const avatarUrl = isReceived ? item.sender_avatar : item.recipient_avatar;

    return (
      <View style={styles.requestItem}>
        <View style={styles.requestHeader}>
          <View style={styles.userInfo}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MessageCircle size={20} color="#6B7280" />
              </View>
            )}
            <View style={styles.userDetails}>
              <Text style={styles.username}>{displayName}</Text>
              <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
            </View>
          </View>
          <View style={styles.statusContainer}>
            {item.status === 'pending' && <Clock size={16} color="#F59E0B" />}
            {item.status === 'accepted' && <Check size={16} color="#10B981" />}
            {item.status === 'rejected' && <X size={16} color="#EF4444" />}
            {item.status === 'ignored' && <UserX size={16} color="#6B7280" />}
          </View>
        </View>
        
        {item.message && (
          <Text style={styles.messageText}>"{item.message}"</Text>
        )}
        
        {isReceived && item.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleResponse(item.id, 'accept')}
            >
              <Check size={16} color="#FFFFFF" />
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleResponse(item.id, 'reject')}
            >
              <X size={16} color="#FFFFFF" />
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.ignoreButton]}
              onPress={() => handleResponse(item.id, 'ignore')}
            >
              <UserX size={16} color="#FFFFFF" />
              <Text style={styles.ignoreButtonText}>Ignore</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat Requests</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#059669" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'received' && styles.activeTab]}
            onPress={() => setActiveTab('received')}
          >
            <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
              Received
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
            onPress={() => setActiveTab('sent')}
          >
            <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
              Sent
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequest}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.requestsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MessageCircle size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>
                No {activeTab} requests
              </Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'received' 
                  ? 'When someone wants to chat with you, their requests will appear here'
                  : 'Your sent chat requests will appear here'
                }
              </Text>
            </View>
          }
        />
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
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#059669',
  },
  tabText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#059669',
    fontWeight: '600',
  },
  requestsList: {
    padding: 16,
  },
  requestItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusContainer: {
    padding: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#4B5563',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  ignoreButton: {
    backgroundColor: '#6B7280',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  ignoreButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },
});

export default ChatRequestsScreen;
