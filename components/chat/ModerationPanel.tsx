import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { Shield, Ban, UserX, Plus, Trash2, Save } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthProvider';

const theme = {
  primary: '#059669',
  primaryLight: '#10B981',
  secondary: '#0F172A',
  accent: '#F59E0B',
  background: '#FFFFFF',
  surface: '#F8FAFC',
  text: '#1E293B',
  textLight: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  error: '#EF4444',
  warning: '#F59E0B',
};

interface ModerationPanelProps {
  visible: boolean;
  onClose: () => void;
  channelId?: string;
}

interface BannedWord {
  id: string;
  word: string;
  severity: 'warning' | 'ban' | 'delete';
  createdBy: string;
}

interface BannedUser {
  id: string;
  username: string;
  reason: string;
  bannedBy: string;
  bannedAt: string;
  duration?: string;
}

const ModerationPanel: React.FC<ModerationPanelProps> = ({ visible, onClose, channelId }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'words' | 'users' | 'settings'>('words');
  const [bannedWords, setBannedWords] = useState<BannedWord[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [newWord, setNewWord] = useState('');
  const [wordSeverity, setWordSeverity] = useState<'warning' | 'ban' | 'delete'>('warning');
  const [autoModeration, setAutoModeration] = useState(true);
  const [spamProtection, setSpamProtection] = useState(true);
  const [linkProtection, setLinkProtection] = useState(false);

  // Check if user has moderation permissions
  const canModerate = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'moderator';
  const canBanModerators = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (visible && canModerate) {
      loadModerationData();
    }
  }, [visible]);

  const loadModerationData = async () => {
    try {
      // Load banned words and users from API
      // This would be actual API calls
      setBannedWords([
        { id: '1', word: 'spam', severity: 'delete', createdBy: 'admin' },
        { id: '2', word: 'scam', severity: 'ban', createdBy: 'admin' },
        { id: '3', word: 'fake', severity: 'warning', createdBy: 'moderator' },
      ]);

      setBannedUsers([
        { 
          id: '1', 
          username: 'spammer123', 
          reason: 'Excessive spam', 
          bannedBy: 'admin',
          bannedAt: '2025-01-01',
          duration: '7 days'
        },
      ]);
    } catch (error) {
      console.error('Error loading moderation data:', error);
    }
  };

  const addBannedWord = async () => {
    if (!newWord.trim()) return;

    try {
      const newBannedWord: BannedWord = {
        id: Date.now().toString(),
        word: newWord.toLowerCase().trim(),
        severity: wordSeverity,
        createdBy: user?.username || 'unknown',
      };

      setBannedWords(prev => [...prev, newBannedWord]);
      setNewWord('');
      
      // Save to API
      Alert.alert('Success', 'Banned word added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to add banned word');
    }
  };

  const removeBannedWord = async (wordId: string) => {
    try {
      setBannedWords(prev => prev.filter(w => w.id !== wordId));
      Alert.alert('Success', 'Banned word removed');
    } catch (error) {
      Alert.alert('Error', 'Failed to remove banned word');
    }
  };

  const unbanUser = async (userId: string) => {
    try {
      setBannedUsers(prev => prev.filter(u => u.id !== userId));
      Alert.alert('Success', 'User unbanned successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to unban user');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'warning': return theme.warning;
      case 'ban': return theme.error;
      case 'delete': return theme.primary;
      default: return theme.textMuted;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'warning': return '⚠️';
      case 'ban': return '🚫';
      case 'delete': return '🗑️';
      default: return '❓';
    }
  };

  const renderWordsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.addWordContainer}>
        <TextInput
          style={styles.wordInput}
          value={newWord}
          onChangeText={setNewWord}
          placeholder="Add banned word..."
          placeholderTextColor={theme.textMuted}
        />
        <View style={styles.severityContainer}>
          {(['warning', 'ban', 'delete'] as const).map((severity) => (
            <TouchableOpacity
              key={severity}
              style={[
                styles.severityButton,
                wordSeverity === severity && styles.severityButtonActive
              ]}
              onPress={() => setWordSeverity(severity)}
            >
              <Text style={[
                styles.severityText,
                wordSeverity === severity && styles.severityTextActive
              ]}>
                {getSeverityIcon(severity)} {severity}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={addBannedWord}
          disabled={!newWord.trim()}
        >
          <Plus size={20} color={theme.background} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={bannedWords}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.wordItem}>
            <View style={styles.wordInfo}>
              <Text style={styles.wordText}>{item.word}</Text>
              <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.severity) }]}>
                <Text style={styles.severityBadgeText}>
                  {getSeverityIcon(item.severity)} {item.severity}
                </Text>
              </View>
            </View>
            <Text style={styles.createdBy}>by {item.createdBy}</Text>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeBannedWord(item.id)}
            >
              <Trash2 size={16} color={theme.error} />
            </TouchableOpacity>
          </View>
        )}
        style={styles.wordsList}
      />
    </View>
  );

  const renderUsersTab = () => (
    <View style={styles.tabContent}>
      <FlatList
        data={bannedUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.userItem}>
            <View style={styles.userInfo}>
              <Text style={styles.username}>{item.username}</Text>
              <Text style={styles.banReason}>{item.reason}</Text>
              <Text style={styles.banDetails}>
                Banned by {item.bannedBy} on {item.bannedAt}
                {item.duration && ` for ${item.duration}`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.unbanButton}
              onPress={() => unbanUser(item.id)}
            >
              <UserX size={16} color={theme.background} />
              <Text style={styles.unbanText}>Unban</Text>
            </TouchableOpacity>
          </View>
        )}
        style={styles.usersList}
      />
    </View>
  );

  const renderSettingsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Auto Moderation</Text>
          <Text style={styles.settingDescription}>
            Automatically moderate messages based on banned words
          </Text>
        </View>
        <Switch
          value={autoModeration}
          onValueChange={setAutoModeration}
          trackColor={{ false: theme.border, true: theme.primaryLight }}
          thumbColor={autoModeration ? theme.primary : theme.textMuted}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Spam Protection</Text>
          <Text style={styles.settingDescription}>
            Prevent users from sending too many messages quickly
          </Text>
        </View>
        <Switch
          value={spamProtection}
          onValueChange={setSpamProtection}
          trackColor={{ false: theme.border, true: theme.primaryLight }}
          thumbColor={spamProtection ? theme.primary : theme.textMuted}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Link Protection</Text>
          <Text style={styles.settingDescription}>
            Require approval for messages containing links
          </Text>
        </View>
        <Switch
          value={linkProtection}
          onValueChange={setLinkProtection}
          trackColor={{ false: theme.border, true: theme.primaryLight }}
          thumbColor={linkProtection ? theme.primary : theme.textMuted}
        />
      </View>

      <TouchableOpacity style={styles.saveButton}>
        <Save size={20} color={theme.background} />
        <Text style={styles.saveButtonText}>Save Settings</Text>
      </TouchableOpacity>
    </View>
  );

  if (!canModerate) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Shield size={48} color={theme.error} />
            <Text style={styles.errorTitle}>Access Denied</Text>
            <Text style={styles.errorText}>
              You don't have permission to access the moderation panel.
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Shield size={24} color={theme.primary} />
            <Text style={styles.headerTitle}>Moderation Panel</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          {(['words', 'users', 'settings'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.activeTab
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText
              ]}>
                {tab === 'words' ? 'Banned Words' : 
                 tab === 'users' ? 'Banned Users' : 'Settings'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'words' && renderWordsTab()}
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
    marginLeft: 12,
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.primary,
    borderRadius: 8,
  },
  closeButtonText: {
    color: theme.background,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.primary,
  },
  tabText: {
    fontSize: 14,
    color: theme.textMuted,
    fontWeight: '500',
  },
  activeTabText: {
    color: theme.primary,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  addWordContainer: {
    marginBottom: 20,
  },
  wordInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.text,
    marginBottom: 12,
  },
  severityContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  severityButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  severityButtonActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  severityText: {
    fontSize: 12,
    color: theme.textMuted,
    fontWeight: '500',
  },
  severityTextActive: {
    color: theme.background,
  },
  addButton: {
    backgroundColor: theme.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  wordsList: {
    flex: 1,
  },
  wordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  wordInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordText: {
    fontSize: 16,
    color: theme.text,
    fontWeight: '500',
    marginRight: 12,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityBadgeText: {
    fontSize: 10,
    color: theme.background,
    fontWeight: '600',
  },
  createdBy: {
    fontSize: 12,
    color: theme.textMuted,
    marginHorizontal: 12,
  },
  removeButton: {
    padding: 8,
  },
  usersList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  banReason: {
    fontSize: 14,
    color: theme.textLight,
    marginTop: 4,
  },
  banDetails: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 4,
  },
  unbanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  unbanText: {
    color: theme.background,
    marginLeft: 4,
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  settingDescription: {
    fontSize: 14,
    color: theme.textLight,
    marginTop: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 24,
  },
  saveButtonText: {
    color: theme.background,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.error,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: theme.textLight,
    textAlign: 'center',
    marginBottom: 24,
  },
});

export default ModerationPanel;
