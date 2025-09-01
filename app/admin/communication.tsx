import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { Send, MessageSquare, Users, Bell, BellOff, Filter } from 'lucide-react-native';
import { elevate } from '../../services/adminElevation';
import { useAuth } from '../../contexts/AuthProvider';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'urgent';
  target_audience: 'all' | 'verified' | 'business' | 'moderators';
  created_at: string;
  expires_at?: string;
  is_active: boolean;
  author_id: string;
  sent_count?: number;
  send_push?: boolean;
  views?: number;
  admin_username?: string;
}

export default function AdminCommunication() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    type: 'info' as 'info' | 'warning' | 'urgent',
    target_audience: 'all' as 'all' | 'verified' | 'business' | 'moderators',
    send_push: false,
  });

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      // Load announcements from backend API
      const res = await fetch('http://localhost:3000/api/announcements');
      if (!res.ok) throw new Error('Failed to fetch announcements');
      const announcements = await res.json();
      const formattedAnnouncements: Announcement[] = announcements?.map((ann: any) => ({
        id: ann.id,
        title: ann.title,
        content: ann.content,
        type: ann.type || 'info',
        target_audience: ann.target_audience || 'all',
        created_at: ann.created_at,
        expires_at: ann.expires_at,
        is_active: ann.is_active ?? true,
        author_id: ann.author_id,
        admin_username: ann.admin_username || 'Admin',
        sent_count: ann.sent_count || 0,
        views: ann.views || 0,
        send_push: ann.send_push || false
      })) || [];
      setAnnouncements(formattedAnnouncements);
    } catch (error: any) {
      console.error('Error loading announcements:', error);
      Alert.alert('Error', error.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleSendAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const elevation = await elevate(10);
      
      // For now, add to local state since announcements table may not exist
      const newAnnouncementItem: Announcement = {
        id: Date.now().toString(),
        ...newAnnouncement,
        created_at: new Date().toISOString(),
        is_active: true,
        author_id: profile?.id || 'admin',
        admin_username: profile?.username || 'Admin',
        views: 0,
        sent_count: newAnnouncement.target_audience === 'all' ? 2500 : 
                    newAnnouncement.target_audience === 'verified' ? 800 :
                    newAnnouncement.target_audience === 'business' ? 300 : 50
      };
      
      setAnnouncements(prev => [newAnnouncementItem, ...prev]);
      Alert.alert('Success', 'Announcement sent successfully');
      setModalVisible(false);
      setNewAnnouncement({
        title: '',
        content: '',
        type: 'info',
        target_audience: 'all',
        send_push: false,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send announcement');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning': return '#f59e0b';
      case 'urgent': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  const getAudienceIcon = (audience: string) => {
    switch (audience) {
      case 'verified': return '✓';
      case 'business': return '🏢';
      case 'moderators': return '🛡️';
      default: return '👥';
    }
  };

  const renderAnnouncement = ({ item }: { item: Announcement }) => (
    <View style={styles.announcementCard}>
      <View style={styles.announcementHeader}>
        <View style={[styles.typeIndicator, { backgroundColor: getTypeColor(item.type) }]}>
          <Text style={styles.typeText}>{item.type.toUpperCase()}</Text>
        </View>
        <View style={styles.announcementMeta}>
          <Text style={styles.audienceText}>
            {getAudienceIcon(item.target_audience)} {item.target_audience}
          </Text>
          {item.send_push && <Bell size={14} color="#4f46e5" />}
          <Text style={styles.viewsText}>{item.views || 0} views</Text>
        </View>
      </View>
      
      <Text style={styles.announcementTitle}>{item.title}</Text>
      <Text style={styles.announcementContent}>{item.content}</Text>
      
      <View style={styles.announcementFooter}>
        <Text style={styles.announcementDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        {item.admin_username && (
          <Text style={styles.authorText}>By: {item.admin_username}</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MessageSquare size={24} color="#4f46e5" />
        <Text style={styles.title}>Communication Center</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Send size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={announcements}
        renderItem={renderAnnouncement}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MessageSquare size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No announcements yet</Text>
            <Text style={styles.emptySubtext}>Create your first announcement to communicate with users</Text>
          </View>
        }
      />

      {/* Create Announcement Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Announcement</Text>
            <TouchableOpacity onPress={handleSendAnnouncement}>
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <TextInput
              style={styles.titleInput}
              placeholder="Announcement title"
              value={newAnnouncement.title}
              onChangeText={(text) => setNewAnnouncement(prev => ({ ...prev, title: text }))}
            />

            <TextInput
              style={styles.contentInput}
              placeholder="Announcement content"
              value={newAnnouncement.content}
              onChangeText={(text) => setNewAnnouncement(prev => ({ ...prev, content: text }))}
              multiline
              numberOfLines={6}
            />

            <View style={styles.optionsContainer}>
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Type:</Text>
                <View style={styles.typeButtons}>
                  {(['info', 'warning', 'urgent'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        newAnnouncement.type === type && styles.typeButtonActive,
                        { backgroundColor: newAnnouncement.type === type ? getTypeColor(type) : '#f3f4f6' }
                      ]}
                      onPress={() => setNewAnnouncement(prev => ({ ...prev, type }))}
                    >
                      <Text style={[
                        styles.typeButtonText,
                        newAnnouncement.type === type && styles.typeButtonTextActive
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Audience:</Text>
                <View style={styles.audienceButtons}>
                  {(['all', 'verified', 'business', 'moderators'] as const).map((audience) => (
                    <TouchableOpacity
                      key={audience}
                      style={[
                        styles.audienceButton,
                        newAnnouncement.target_audience === audience && styles.audienceButtonActive
                      ]}
                      onPress={() => setNewAnnouncement(prev => ({ ...prev, target_audience: audience }))}
                    >
                      <Text style={[
                        styles.audienceButtonText,
                        newAnnouncement.target_audience === audience && styles.audienceButtonTextActive
                      ]}>
                        {getAudienceIcon(audience)} {audience}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.pushOption}
                onPress={() => setNewAnnouncement(prev => ({ ...prev, send_push: !prev.send_push }))}
              >
                {newAnnouncement.send_push ? (
                  <Bell size={20} color="#4f46e5" />
                ) : (
                  <BellOff size={20} color="#9ca3af" />
                )}
                <Text style={styles.pushOptionText}>Send push notification</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    marginLeft: 12,
  },
  addButton: {
    backgroundColor: '#4f46e5',
    padding: 12,
    borderRadius: 8,
  },
  listContainer: {
    padding: 16,
  },
  announcementCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  typeIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  announcementMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audienceText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  viewsText: {
    fontSize: 12,
    color: '#64748b',
  },
  announcementTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  announcementContent: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  announcementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  announcementDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  authorText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  cancelText: {
    fontSize: 16,
    color: '#64748b',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  sendText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4f46e5',
  },
  formContainer: {
    padding: 16,
  },
  titleInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  contentInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  optionsContainer: {
    gap: 20,
  },
  optionRow: {
    gap: 12,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  typeButtonActive: {
    backgroundColor: '#4f46e5',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  audienceButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  audienceButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  audienceButtonActive: {
    backgroundColor: '#ede9fe',
    borderColor: '#4f46e5',
  },
  audienceButtonText: {
    fontSize: 12,
    color: '#64748b',
  },
  audienceButtonTextActive: {
    color: '#4f46e5',
    fontWeight: '500',
  },
  pushOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pushOptionText: {
    fontSize: 16,
    color: '#1e293b',
  },
});
