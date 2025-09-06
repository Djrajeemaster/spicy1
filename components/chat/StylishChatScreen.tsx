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
  Keyboard,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { 
  MessageCircle, 
  Send, 
  Plus, 
  Users, 
  Settings, 
  UserX, 
  Smile,
  Gift,
  Link,
  Camera,
  Mic,
  Search,
  MoreVertical,
  Shield,
  Ban
} from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthProvider';
import { chatService, ChatChannel, Message as ChatMessage, User } from '../../services/enhancedChatService';
import ModernEmojiPicker from './ModernEmojiPicker';
import ModerationPanel from './ModerationPanel';

const { width, height } = Dimensions.get('window');

// Theme colors matching your website
const theme = {
  primary: '#059669',
  primaryLight: '#10B981', 
  secondary: '#0F172A',
  accent: '#F59E0B',
  background: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceDark: '#E2E8F0',
  text: '#1E293B',
  textLight: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  success: '#059669',
  warning: '#F59E0B',
  error: '#EF4444',
  online: '#22C55E',
  offline: '#94A3B8',
};

// GenZ words and chat shortcuts
const GENZ_SUGGESTIONS = [
  { text: 'fr', replacement: 'for real' },
  { text: 'ngl', replacement: 'not gonna lie' },
  { text: 'iykyk', replacement: 'if you know you know' },
  { text: 'periodt', replacement: 'period' },
  { text: 'slay', replacement: 'slay 💅' },
  { text: 'bet', replacement: 'bet ✅' },
  { text: 'no cap', replacement: 'no cap 🧢' },
  { text: 'fam', replacement: 'fam 👨‍👩‍👧‍👦' },
  { text: 'vibe', replacement: 'vibe ✨' },
  { text: 'periodt', replacement: 'periodt 💅' },
];

// Banned words for moderation
const BANNED_WORDS = ['spam', 'fake', 'scam', 'hack', 'virus'];

interface StylishChatScreenProps {
  visible: boolean;
  onClose: () => void;
}

const StylishChatScreen: React.FC<StylishChatScreenProps> = ({ visible, onClose }) => {
  const { user } = useAuth();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showChannelList, setShowChannelList] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [pickerType, setPickerType] = useState<'emoji' | 'gif'>('emoji');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && user) {
      loadChannels();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, user]);

  useEffect(() => {
    if (selectedChannel) {
      loadMessages();
      setShowChannelList(false);
    }
  }, [selectedChannel]);

  // Load suggestions based on input
  useEffect(() => {
    if (newMessage.length > 0) {
      const lastWord = newMessage.toLowerCase().split(' ').pop() || '';
      const matchedSuggestions = GENZ_SUGGESTIONS.filter(s => 
        s.text.toLowerCase().includes(lastWord) && lastWord.length > 1
      );
      
      if (matchedSuggestions.length > 0) {
        setSuggestions(matchedSuggestions);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [newMessage]);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const channelsData = await chatService.getChannels();
      const validChannels = Array.isArray(channelsData) ? channelsData : [];
      setChannels(validChannels);
      
      if (!selectedChannel && validChannels.length > 0) {
        const globalChannel = validChannels.find((c: ChatChannel) => c.type === 'global');
        if (globalChannel) {
          setSelectedChannel(globalChannel);
        }
      }
    } catch (error) {
      console.error('Error loading channels:', error);
      setChannels([]);
      Alert.alert('Error', 'Failed to load chat channels');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedChannel) return;
    
    try {
      const messagesData = await chatService.getMessages(selectedChannel.id);
      const validMessages = Array.isArray(messagesData) ? messagesData : [];
      setMessages(validMessages);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
      Alert.alert('Error', 'Failed to load messages');
    }
  };

  const sendMessage = async () => {
    if (!selectedChannel || !newMessage.trim()) return;

    // Check for banned words
    const messageText = newMessage.toLowerCase();
    const containsBannedWord = BANNED_WORDS.some(word => messageText.includes(word));
    
    if (containsBannedWord && user?.role !== 'admin' && user?.role !== 'super_admin') {
      Alert.alert('Message Blocked', 'Your message contains prohibited content.');
      return;
    }

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
      setShowSuggestions(false);
      
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

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return date.toLocaleDateString();
  };

  const getChannelDisplayName = (channel: ChatChannel) => {
    if (channel.type === 'global') return '🌍 Global Chat';
    if (channel.type === 'private') return `💬 ${channel.name || 'Private Chat'}`;
    return `👥 ${channel.name}`;
  };

  const getChannelIcon = (channel: ChatChannel) => {
    switch (channel.type) {
      case 'global':
        return <Users size={24} color={theme.primary} />;
      case 'group':
        return <Users size={24} color={theme.accent} />;
      case 'private':
        return <MessageCircle size={24} color={theme.primaryLight} />;
      default:
        return <MessageCircle size={24} color={theme.textMuted} />;
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleGifSelect = (gifUrl: string) => {
    setNewMessage(prev => prev + `[GIF: ${gifUrl}]`);
    setShowGifPicker(false);
    inputRef.current?.focus();
  };

  const openEmojiPicker = () => {
    setPickerType('emoji');
    setShowEmojiPicker(true);
    setShowGifPicker(false);
  };

  const openGifPicker = () => {
    setPickerType('gif');
    setShowGifPicker(true);
    setShowEmojiPicker(false);
  };

  const closePickers = () => {
    setShowEmojiPicker(false);
    setShowGifPicker(false);
  };

  const handleSuggestionSelect = (suggestion: any) => {
    const words = newMessage.split(' ');
    words[words.length - 1] = suggestion.replacement;
    setNewMessage(words.join(' ') + ' ');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const shareCurrentDeal = () => {
    // Add logic to share current deal
    const dealText = "🔥 Check out this amazing deal! Link: [deal-link]";
    setNewMessage(prev => prev + dealText);
  };

  const banUser = async (userId: string) => {
    if (user?.role !== 'admin' && user?.role !== 'super_admin' && user?.role !== 'moderator') {
      Alert.alert('Permission Denied', 'You do not have permission to ban users.');
      return;
    }
    
    try {
      // Add ban user logic here
      Alert.alert('User Banned', 'User has been banned from the chat.');
    } catch (error) {
      Alert.alert('Error', 'Failed to ban user.');
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
      <View style={styles.channelAvatar}>
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
      <View style={styles.channelMeta}>
        {item.last_message_at && (
          <Text style={styles.messageTime}>
            {formatMessageTime(item.last_message_at)}
          </Text>
        )}
        {item.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unread_count}</Text>
          </View>
        )}
      </View>
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
            {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'moderator') && (
              <TouchableOpacity 
                style={styles.banButton}
                onPress={() => banUser(item.sender_id)}
              >
                <Ban size={12} color={theme.error} />
              </TouchableOpacity>
            )}
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
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Search size={24} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowModerationPanel(true)}
          >
            <Shield size={24} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={onClose}>
            <UserX size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>
      
      <FlatList
        data={channels}
        keyExtractor={(item) => item.id}
        renderItem={renderChannelItem}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        contentContainerStyle={styles.channelList}
        showsVerticalScrollIndicator={false}
      />
    </Animated.View>
  );

  const renderChatView = () => (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
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
          <View>
            <Text style={styles.chatHeaderTitle}>
              {getChannelDisplayName(selectedChannel!)}
            </Text>
            <Text style={styles.chatHeaderSubtitle}>
              {selectedChannel?.member_count} members • Online
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <MoreVertical size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
      />

      {/* Suggestions */}
      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            horizontal
            keyExtractor={(item) => item.text}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSuggestionSelect(item)}
              >
                <Text style={styles.suggestionText}>{item.text}</Text>
                <Text style={styles.suggestionReplacement}>{item.replacement}</Text>
              </TouchableOpacity>
            )}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {/* Input Container */}
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TouchableOpacity 
            style={styles.inputButton}
            onPress={openEmojiPicker}
          >
            <Smile size={24} color={theme.primary} />
          </TouchableOpacity>
          
          <TextInput
            ref={inputRef}
            style={styles.messageInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor={theme.textMuted}
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity 
            style={styles.inputButton}
            onPress={openGifPicker}
          >
            <Gift size={24} color={theme.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.inputButton}
            onPress={shareCurrentDeal}
          >
            <Link size={24} color={theme.accent} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.sendButton, newMessage.trim() ? styles.sendButtonActive : {}]}
            onPress={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Send size={20} color={newMessage.trim() ? theme.background : theme.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modern Emoji/GIF Picker */}
      <ModernEmojiPicker
        visible={showEmojiPicker || showGifPicker}
        type={pickerType}
        onSelect={pickerType === 'emoji' ? handleEmojiSelect : handleGifSelect}
        onClose={closePickers}
      />
    </Animated.View>
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
        
        {/* Moderation Panel */}
        <ModerationPanel
          visible={showModerationPanel}
          onClose={() => setShowModerationPanel(false)}
          channelId={selectedChannel?.id}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: theme.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.background,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: theme.surface,
  },
  channelList: {
    padding: 0,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.background,
  },
  selectedChannelItem: {
    backgroundColor: theme.surface,
  },
  channelAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: theme.textLight,
  },
  channelMeta: {
    alignItems: 'flex-end',
  },
  messageTime: {
    fontSize: 12,
    color: theme.textMuted,
    marginBottom: 4,
  },
  unreadBadge: {
    backgroundColor: theme.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: theme.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.background,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    paddingRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.primary,
    fontWeight: '600',
  },
  chatHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHeaderIcon: {
    marginRight: 12,
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  chatHeaderSubtitle: {
    fontSize: 12,
    color: theme.textLight,
    marginTop: 2,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.primary,
    marginRight: 8,
  },
  messageTimestamp: {
    fontSize: 10,
    color: theme.textMuted,
  },
  banButton: {
    marginLeft: 8,
    padding: 4,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  ownMessageBubble: {
    backgroundColor: theme.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: theme.surface,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: theme.background,
  },
  otherMessageText: {
    color: theme.text,
  },
  ownMessageTime: {
    fontSize: 10,
    color: theme.textMuted,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  suggestionsContainer: {
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingVertical: 8,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    backgroundColor: theme.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.primary,
  },
  suggestionReplacement: {
    fontSize: 10,
    color: theme.textLight,
  },
  inputContainer: {
    backgroundColor: theme.background,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  inputButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    maxHeight: 100,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.surface,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.surfaceDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: theme.primary,
  },
});

export default StylishChatScreen;
