import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  Image,
} from 'react-native';
import { MessageCircle, Send, Plus, Users, Settings, UserX } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthProvider';
import { chatService, ChatChannel, Message as ChatMessage, User } from '../../services/enhancedChatService';

interface ChatScreenProps {
  visible: boolean;
  onClose: () => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ visible, onClose }) => {
  const { user } = useAuth();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showChannelList, setShowChannelList] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible && user) {
      loadChannels();
    }
  }, [visible, user]);

  useEffect(() => {
    if (selectedChannel) {
      loadMessages();
      setShowChannelList(false);
    }
  }, [selectedChannel]);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const channelsData = await chatService.getChannels();
      
      // Ensure we have a valid array
      const validChannels = Array.isArray(channelsData) ? channelsData : [];
      setChannels(validChannels);
      
      // Auto-select global channel if no channel is selected
      if (!selectedChannel && validChannels.length > 0) {
        const globalChannel = validChannels.find((c: ChatChannel) => c.type === 'global');
        if (globalChannel) {
          setSelectedChannel(globalChannel);
        }
      }
    } catch (error) {
      console.error('Error loading channels:', error);
      setChannels([]); // Set empty array on error
      Alert.alert('Error', 'Failed to load chat channels');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedChannel) return;
    
    try {
      const messagesData = await chatService.getMessages(selectedChannel.id);
      // Ensure we have a valid array
      const validMessages = Array.isArray(messagesData) ? messagesData : [];
      setMessages(validMessages);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]); // Set empty array on error
      Alert.alert('Error', 'Failed to load messages');
    }
  };

  const sendMessage = async () => {
    if (!selectedChannel || !newMessage.trim()) return;

    try {
      const message = await chatService.sendMessage(
        selectedChannel.id,
        newMessage.trim()
      );
      
      setMessages(prev => {
        const currentMessages = Array.isArray(prev) ? prev : [];
        return [...currentMessages, message];
      });
      setNewMessage('');
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (showChannelList) {
      await loadChannels();
    } else {
      await loadMessages();
    }
    setRefreshing(false);
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const getChannelDisplayName = (channel: ChatChannel) => {
    if (channel.type === 'global') return 'Global Chat';
    return channel.name;
  };

  const getChannelIcon = (channel: ChatChannel) => {
    switch (channel.type) {
      case 'global':
        return <Users size={20} color="#059669" />;
      case 'group':
        return <Users size={20} color="#3B82F6" />;
      case 'private':
        return <MessageCircle size={20} color="#8B5CF6" />;
      default:
        return <MessageCircle size={20} color="#6B7280" />;
    }
  };

  const renderChannelItem = ({ item }: { item: ChatChannel }) => (
    <TouchableOpacity
      style={[
        styles.channelItem,
        selectedChannel?.id === item.id && styles.selectedChannelItem
      ]}
      onPress={() => setSelectedChannel(item)}
    >
      <View style={styles.channelIcon}>
        {getChannelIcon(item)}
      </View>
      <View style={styles.channelInfo}>
        <Text style={styles.channelName}>{getChannelDisplayName(item)}</Text>
        {item.last_message && (
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.last_message.sender_username ? `${item.last_message.sender_username}: ` : ''}{item.last_message.content}
          </Text>
        )}
      </View>
      {item.last_message_at && (
        <Text style={styles.messageTime}>
          {formatMessageTime(item.last_message_at)}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwnMessage = item.sender_id === user?.id;
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
      ]}>
        {!isOwnMessage && (
          <View style={styles.messageHeader}>
            <Text style={styles.senderName}>{item.sender.username}</Text>
            <Text style={styles.messageTimestamp}>
              {formatMessageTime(item.created_at)}
            </Text>
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
        </View>
        {isOwnMessage && (
          <Text style={styles.ownMessageTime}>
            {formatMessageTime(item.created_at)}
          </Text>
        )}
      </View>
    );
  };

  const renderChannelList = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Plus size={24} color="#059669" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Settings size={24} color="#059669" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={onClose}>
            <UserX size={24} color="#059669" />
          </TouchableOpacity>
        </View>
      </View>
      
      <FlatList
        data={channels}
        keyExtractor={(item) => item.id}
        renderItem={renderChannelItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.channelList}
      />
    </View>
  );

  const renderChatView = () => (
    <View style={styles.container}>
      <View style={styles.chatHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setShowChannelList(true)}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.chatHeaderInfo}>
          <View style={styles.chatHeaderIcon}>
            {getChannelIcon(selectedChannel!)}
          </View>
          <Text style={styles.chatHeaderTitle}>
            {getChannelDisplayName(selectedChannel!)}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <Settings size={24} color="#059669" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.messagesList}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !newMessage.trim() && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={!newMessage.trim()}
        >
          <Send size={20} color={newMessage.trim() ? "#FFFFFF" : "#9CA3AF"} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {showChannelList ? renderChannelList() : renderChatView()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  channelList: {
    padding: 16,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
  },
  selectedChannelItem: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  chatHeaderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: '#6B7280',
  },
  messageTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '500',
  },
  chatHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHeaderIcon: {
    marginRight: 8,
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginRight: 8,
  },
  messageTimestamp: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  ownMessageBubble: {
    backgroundColor: '#059669',
  },
  otherMessageBubble: {
    backgroundColor: '#F3F4F6',
  },
  messageText: {
    fontSize: 16,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#111827',
  },
  ownMessageTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
});

export default ChatScreen;
