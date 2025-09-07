import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  X,
  Smile,
  Gift,
  Link,
  Camera,
  Mic,
  Search,
  MoreVertical,
  Shield,
  Ban,
  CheckCheck,
  Trash2,
  Flag,
} from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthProvider';
import { chatService, ChatChannel, Message as ChatMessage, User } from '../../services/enhancedChatService';
import ModernEmojiPicker from './ModernEmojiPicker';
import ModerationPanel from './ModerationPanel';

const { width, height } = Dimensions.get('window');

// Clean modern theme
const theme = {
  primary: '#007AFF',
  primaryLight: '#5AC8FA', 
  primaryDark: '#0051D5',
  secondary: '#1C1C1E',
  accent: '#FF9500',
  background: '#000000',
  surface: '#1C1C1E',
  surfaceDark: '#2C2C2E',
  text: '#FFFFFF',
  textLight: '#E5E5E7',
  textMuted: '#8E8E93',
  border: '#38383A',
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  online: '#30D158',
  offline: '#8E8E93',
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
  const [gifLoadError, setGifLoadError] = useState<{[key: string]: boolean}>({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [messageReactions, setMessageReactions] = useState<{[key: string]: string[]}>({});
  const [reactingToMessage, setReactingToMessage] = useState<ChatMessage | null>(null);
  const [isUserBanned, setIsUserBanned] = useState(false);
  const [showUnbanRequest, setShowUnbanRequest] = useState(false);
  const [showMessageOptions, setShowMessageOptions] = useState(false);
  const [selectedMessageForOptions, setSelectedMessageForOptions] = useState<ChatMessage | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [chatHeight, setChatHeight] = useState(height * 0.8); // Default to 80% of screen height

  const increaseChatHeight = () => {
    const newHeight = Math.min(chatHeight + 100, height * 0.95);
    setChatHeight(newHeight);
  };

  const decreaseChatHeight = () => {
    const newHeight = Math.max(chatHeight - 100, height * 0.5);
    setChatHeight(newHeight);
  };

  
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isTypingRef = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && user) {
      loadChannels();
      checkUserBanStatus();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Real typing indicator would be handled by WebSocket events
      // For now, we'll only show typing when the current user is typing
    }
  }, [visible, user]);

  const checkUserBanStatus = async () => {
    if (!user) return;

    try {
      const banned = await chatService.isUserBanned(user.id);
      setIsUserBanned(banned);
    } catch (error) {
      console.warn('Ban status check failed, assuming user is not banned:', error);
      setIsUserBanned(false);
    }
  };

  useEffect(() => {
    if (selectedChannel) {
      loadMessages();
      setShowChannelList(false);
    }
  }, [selectedChannel]);

  useEffect(() => {
    // Handle suggestions
    if (newMessage.length > 1) {
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

    // Handle typing indicator emission
    if (selectedChannel) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (newMessage.length > 0 && !isTypingRef.current) {
        isTypingRef.current = true;
        chatService.startTyping(selectedChannel.id);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (isTypingRef.current) {
          isTypingRef.current = false;
          chatService.stopTyping(selectedChannel.id);
        }
      }, 2000); // 2-second timeout for "stop typing"
    }

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
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
      
      // Load online count
      loadOnlineCount();
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
      Alert.alert('Error', 'Failed to load messages');
    }
  };

  const loadOnlineCount = async () => {
    if (!selectedChannel) return;
    
    try {
      const onlineData = await chatService.getOnlineUsers(selectedChannel.id);
      setOnlineCount(onlineData.count || 0);
    } catch (error) {
      console.error('Error loading online count:', error);
      setOnlineCount(0);
    }
  };

  const sendMessage = async () => {
    if (!selectedChannel) return;

    // Check if we have text (no need to check for selectedGif anymore)
    if (!newMessage.trim()) return;

    // Check if user is banned
    if (isUserBanned) {
      Alert.alert('Banned', 'You are banned from this chat. Please request an unban if you believe this was a mistake.');
      return;
    }

    // Additional client-side validation for text
    if (newMessage.length > 1000) {
      Alert.alert('Error', 'Message is too long (max 1000 characters)');
      return;
    }

    // Check for saversdream URLs only
    const urlRegex = /https?:\/\/[^\s]+/gi;
    const urls = newMessage.match(urlRegex);
    if (urls) {
      const invalidUrls = urls.filter(url => 
        !url.includes('saversdream.com') && 
        !url.includes('localhost') && 
        !url.includes('127.0.0.1')
      );
      if (invalidUrls.length > 0) {
        Alert.alert('Error', 'Only saversdream.com URLs are allowed in messages');
        return;
      }
    }

    try {
      // Send text message
      const message = await chatService.sendValidatedMessage(
        selectedChannel.id,
        newMessage.trim()
      );
      
      setMessages(prev => {
        const currentMessages = Array.isArray(prev) ? prev : [];
        // Keep only last 100 messages
        const updatedMessages = [...currentMessages, message];
        return updatedMessages.slice(-100);
      });
      
      // Clear text
      setNewMessage('');
      setShowSuggestions(false);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error.message || 'Failed to send message');
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
    if (channel.type === 'global') return '💬 Saversdream Public Chat';
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

  const handleGifSelect = async (gifUrl: string) => {
    if (!selectedChannel) {
      console.log('No selected channel for GIF');
      return;
    }

    console.log('handleGifSelect called with URL:', gifUrl);
    console.log('Selected channel:', selectedChannel.id);

    try {
      console.log('Sending GIF directly to chat:', gifUrl);

      // Send GIF message directly
      const gifMessage = await chatService.sendMessage(
        selectedChannel.id,
        `[GIF: ${gifUrl}]`, // Content for GIF messages with URL
        'gif', // Special message type
        undefined,
        undefined,
        { gifUrl } // GIF URL in metadata
      );

      console.log('GIF message sent:', gifMessage);
      console.log('GIF message metadata:', gifMessage.metadata);
      console.log('GIF message type:', gifMessage.message_type);

      // Add to local messages immediately
      setMessages(prev => {
        const currentMessages = Array.isArray(prev) ? prev : [];
        const updatedMessages = [...currentMessages, gifMessage];
        console.log('Updated messages after GIF send:', updatedMessages.length, 'messages');
        console.log('Last message:', updatedMessages[updatedMessages.length - 1]);
        return updatedMessages.slice(-100);
      });

      // Close picker and scroll to bottom
      setShowGifPicker(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error: any) {
      console.error('Error sending GIF:', error);
      Alert.alert('Error', error.message || 'Failed to send GIF');
    }
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

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'super_admin': return '#FF453A';
      case 'admin': return '#FF9F0A';
      case 'moderator': return '#30D158';
      case 'vip': return '#8B5CF6';
      default: return theme.primary;
    }
  };

  const getRoleBadge = (role?: string) => {
    if (!role || role === 'user') return null;
    
    const badges = {
      super_admin: { text: 'SA', color: '#FF453A' },
      admin: { text: 'A', color: '#FF9F0A' },
      moderator: { text: 'M', color: '#30D158' },
      vip: { text: 'VIP', color: '#8B5CF6' }
    };
    
    const badge = badges[role as keyof typeof badges];
    if (!badge) return null;
    
    return (
      <View style={[styles.roleBadge, { backgroundColor: badge.color }]}>
        <Text style={styles.roleBadgeText}>{badge.text}</Text>
      </View>
    );
  };

  const banUser = async (userId: string) => {
    if (user?.role !== 'admin' && user?.role !== 'super_admin' && user?.role !== 'moderator') {
      Alert.alert('Permission Denied', 'You do not have permission to ban users.');
      return;
    }
    
    try {
      Alert.alert('User Banned', 'User has been banned from the chat.');
    } catch (error) {
      Alert.alert('Error', 'Failed to ban user.');
    }
  };

  const handleReaction = async (message: ChatMessage, reaction: string) => {
    setReactingToMessage(null); // Close the reaction picker immediately

    const existingReaction = message.reactions?.find(r => r.reaction === reaction);
    const userHasReacted = existingReaction?.user_reacted;

    // Optimistically update the UI
    const originalMessages = messages;
    const newMessages = messages.map(m => {
      if (m.id === message.id) {
        // This is a simplified optimistic update. A real implementation would be more robust.
        const newReactions = userHasReacted 
          ? m.reactions?.filter(r => r.reaction !== reaction)
          : [...(m.reactions || []), { reaction, count: (existingReaction?.count || 0) + 1, users: [], user_reacted: true }];
        return { ...m, reactions: newReactions };
      }
      return m;
    });
    setMessages(newMessages);

    try {
      const updatedMessage = userHasReacted
        ? await chatService.removeReaction(message.id, reaction)
        : await chatService.addReaction(message.id, reaction);
      setMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
    } catch (error) {
      console.error('Failed to update reaction', error);
      setMessages(originalMessages); // Revert on error
      Alert.alert('Error', 'Could not apply reaction.');
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

  const handleUsernamePress = async (targetUser: User) => {
    if (!user) return;

    // Don't allow messaging yourself
    if (targetUser.id === user.id) return;

    try {
      // Check if user can send private messages
      const canMessage = await chatService.canSendPrivateMessage(targetUser.id);
      
      if (!canMessage) {
        Alert.alert('Cannot Message User', 'This user has disabled private messages or you need to send a chat request first.');
        return;
      }

      // Get or create private channel
      const privateChannel = await chatService.getOrCreatePrivateChannel(targetUser.id);
      
      // Switch to private chat
      setSelectedChannel(privateChannel);
      setShowChannelList(false);
      
      // Load messages for private chat with cleanup
      const privateMessages = await chatService.getPrivateMessagesWithCleanup(privateChannel.id);
      setMessages(privateMessages);
    } catch (error) {
      console.error('Error opening private chat:', error);
      Alert.alert('Error', 'Failed to open private chat');
    }
  };

  const handleBanUser = async (targetUser: User) => {
    if (!user) return;

    // Check if current user has permission to ban
    const canBan = ['moderator', 'admin', 'super_admin'].includes(user.role || '');
    
    if (!canBan) {
      Alert.alert('Permission Denied', 'You do not have permission to ban users.');
      return;
    }

    Alert.prompt(
      'Ban User',
      `Enter reason for banning ${targetUser.username}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban',
          onPress: async (reason) => {
            if (!reason || reason.trim() === '') {
              Alert.alert('Error', 'Please provide a reason for the ban.');
              return;
            }

            try {
              await chatService.banUserFromChat(
                targetUser.id,
                reason.trim(),
                selectedChannel?.id
              );
              Alert.alert('Success', `${targetUser.username} has been banned.`);
            } catch (error) {
              console.error('Error banning user:', error);
              Alert.alert('Error', 'Failed to ban user');
            }
          }
        }
      ]
    );
  };

  const handleUnbanRequest = async () => {
    if (!user) return;

    Alert.prompt(
      'Request Unban',
      'Please explain why you should be unbanned:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async (reason) => {
            if (!reason || reason.trim() === '') {
              Alert.alert('Error', 'Please provide a reason for the unban request.');
              return;
            }

            try {
              await chatService.requestUnban(reason.trim());
              Alert.alert('Success', 'Your unban request has been submitted. A moderator will review it.');
            } catch (error) {
              console.error('Error submitting unban request:', error);
              Alert.alert('Error', 'Failed to submit unban request');
            }
          }
        }
      ]
    );
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await chatService.deleteMessage(messageId, 'Deleted by moderator');
      setShowMessageOptions(false);
      setSelectedMessageForOptions(null);
      
      // Remove the message from the local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      Alert.alert('Success', 'Message has been deleted.');
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('Error', 'Failed to delete message. Please try again.');
    }
  };

  const handleReportMessage = async (messageId: string) => {
    Alert.alert(
      'Report Message',
      'Are you sure you want to report this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Report', 
          onPress: () => {
            // TODO: Implement report functionality
            Alert.alert('Success', 'Message has been reported.');
            setShowMessageOptions(false);
            setSelectedMessageForOptions(null);
          }
        }
      ]
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isCurrentUser = item.sender?.id === user?.id;
    const canModerate = ['moderator', 'admin', 'super_admin'].includes(user?.role || '');
    const isBanned = false; // Ban functionality not fully implemented yet

    const handleMessageLongPress = () => {
      setSelectedMessageForOptions(item);
      setShowMessageOptions(true);
    };

    // Handle GIF content
    const renderMessageContent = () => {
      console.log('Rendering message:', item.id, 'type:', item.message_type, 'content:', item.content, 'metadata:', item.metadata);

      // Check for GIF message type with metadata
      if (item.message_type === 'gif' && item.metadata?.gifUrl) {
        console.log('Found GIF message with URL:', item.metadata.gifUrl);
        const hasError = gifLoadError[item.id];
        
        if (hasError) {
          return (
            <View style={styles.messageContent}>
              <Text style={styles.messageText}>
                [GIF Failed: {item.metadata.gifUrl}]
              </Text>
            </View>
          );
        }

        return (
          <View style={styles.messageContent}>
            <Image
              source={{ uri: item.metadata.gifUrl }}
              style={styles.gifImage}
              resizeMode="contain"
              onError={(e) => {
                console.log('GIF load error:', e.nativeEvent.error, 'URL:', item.metadata.gifUrl);
                setGifLoadError(prev => ({ ...prev, [item.id]: true }));
              }}
              onLoad={() => console.log('GIF loaded successfully:', item.metadata.gifUrl)}
            />
          </View>
        );
      }

      // Check for GIF embedded in content
      if (item.content.includes('[GIF:') && item.content.includes(']')) {
        const gifMatch = item.content.match(/\[GIF:\s*(.*?)\]/);
        const gifUrl = gifMatch ? gifMatch[1] : null;
        const textContent = item.content.replace(/\[GIF:\s*.*?\]/, '').trim();

        console.log('Found GIF in content, URL:', gifUrl);

        if (gifUrl) {
          const hasError = gifLoadError[item.id];
          
          if (hasError) {
            return (
              <View style={styles.messageContent}>
                <Text style={styles.messageText}>
                  [GIF: {gifUrl}]
                </Text>
                {textContent ? <Text style={styles.messageText}>{textContent}</Text> : null}
              </View>
            );
          }

          return (
            <View style={styles.messageContent}>
              <Image
                source={{ uri: gifUrl }}
                style={styles.gifImage}
                resizeMode="contain"
                onError={(e) => {
                  console.log('GIF load error:', e.nativeEvent.error, 'URL:', gifUrl);
                  setGifLoadError(prev => ({ ...prev, [item.id]: true }));
                }}
                onLoad={() => console.log('GIF loaded successfully:', gifUrl)}
              />
              {textContent ? <Text style={styles.messageText}>{textContent}</Text> : null}
            </View>
          );
        }
      }

      return <Text style={styles.messageText}>{item.content}</Text>;
    };

    return (
      <TouchableOpacity 
        style={styles.messageContainer}
        onLongPress={handleMessageLongPress}
        delayLongPress={500}
      >
        <View style={styles.messageRow}>
          <TouchableOpacity
            onPress={() => item.sender && handleUsernamePress(item.sender)}
            style={styles.usernameTouchable}
          >
            <Text style={[styles.username, { color: getRoleColor(item.sender?.role) }]}>
              {item.sender?.username || 
               item.sender_username || 
               'Unknown'}
            </Text>
          </TouchableOpacity>
          
          {renderMessageContent()}
          
          {canModerate && item.sender && !isCurrentUser && (
            <TouchableOpacity
              onPress={() => handleBanUser(item.sender!)}
              style={styles.banButton}
            >
              <Ban size={14} color={theme.error} />
            </TouchableOpacity>
          )}
        </View>
        
        {isBanned ? (
          <Text style={styles.bannedText}>
            This user has been banned for violating chat rules
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderChatView = () => (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.chatHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setShowChannelList(true)}
        >
          <Text style={styles.backButtonText}>← Chats</Text>
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
              {selectedChannel?.member_count} members • {onlineCount} online
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => {
            const isModerator = ['moderator', 'admin', 'super_admin'].includes(user?.role || '');
            const isChannelOwner = selectedChannel?.created_by === user?.id;
            
            const menuOptions = [
              { text: 'Search Messages', onPress: () => Alert.alert('Search', 'Message search feature coming soon!') },
              { text: 'Channel Info', onPress: () => {
                Alert.alert(
                  `${selectedChannel?.name} Info`,
                  `Members: ${selectedChannel?.member_count}\nCreated: ${selectedChannel?.created_at ? new Date(selectedChannel.created_at).toLocaleDateString() : 'Unknown'}\nDescription: ${selectedChannel?.description || 'No description'}`
                );
              }},
              { text: 'Notification Settings', onPress: () => {
                Alert.alert(
                  'Notifications',
                  'Choose notification preference',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'All Messages', onPress: () => Alert.alert('✅', 'You will receive notifications for all messages') },
                    { text: 'Mentions Only', onPress: () => Alert.alert('✅', 'You will only receive notifications for mentions') },
                    { text: 'Muted', onPress: () => Alert.alert('🔇', 'Channel notifications muted') }
                  ]
                );
              }},
              { text: 'Share Channel', onPress: () => Alert.alert('Share', `Channel invite link: spicy://chat/${selectedChannel?.id}`) },
              { text: 'View Members', onPress: () => Alert.alert('Members', `Channel has ${selectedChannel?.member_count} members. Member list coming soon!`) },
              { text: 'Pin Channel', onPress: () => Alert.alert('📌', 'Channel pinned to top of your list') },
              { text: 'Export Chat', onPress: () => Alert.alert('Export', 'Chat export feature coming soon!') },
              { text: 'Mark as Read', onPress: () => Alert.alert('✅', 'All messages marked as read') },
              { text: 'Block Channel', onPress: () => {
                Alert.alert(
                  'Block Channel',
                  'Temporarily hide this channel from your list?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Block for 1 hour', onPress: () => Alert.alert('🚫', 'Channel blocked for 1 hour') },
                    { text: 'Block for 24 hours', onPress: () => Alert.alert('🚫', 'Channel blocked for 24 hours') }
                  ]
                );
              }},
              { text: 'Report Channel', onPress: () => Alert.alert('Report', 'Channel reported to administrators for review') },
              { text: 'Theme Settings', onPress: () => {
                Alert.alert(
                  'Chat Theme',
                  'Choose your preferred theme',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Dark Theme', onPress: () => Alert.alert('🌙', 'Dark theme applied') },
                    { text: 'Light Theme', onPress: () => Alert.alert('☀️', 'Light theme applied') },
                    { text: 'Auto (System)', onPress: () => Alert.alert('🔄', 'Auto theme enabled') }
                  ]
                );
              }},
              { text: 'Help & Support', onPress: () => {
                Alert.alert(
                  'Help & Support',
                  'Need help with the chat?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Chat Tutorial', onPress: () => Alert.alert('📚', 'Tutorial coming soon!') },
                    { text: 'Contact Support', onPress: () => Alert.alert('📧', 'support@spicymug.com') },
                    { text: 'Report Bug', onPress: () => Alert.alert('🐛', 'Bug report submitted') }
                  ]
                );
              }}
            ];

            // Add moderator/admin options
            if (isModerator) {
              menuOptions.splice(1, 0, {
                text: 'Moderate Channel',
                onPress: () => setShowModerationPanel(true)
              });
              menuOptions.splice(2, 0, {
                text: 'Chat Statistics',
                onPress: () => Alert.alert('📊 Statistics', `Messages: ${messages.length}\nMembers: ${selectedChannel?.member_count}\nActive users: ${onlineCount}`)
              });
            }

            // Add channel management options for owner
            if (isChannelOwner || isModerator) {
              menuOptions.splice(2, 0, {
                text: 'Channel Settings',
                onPress: () => {
                  Alert.alert(
                    'Channel Settings',
                    'Manage channel preferences',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Edit Channel Name', onPress: () => Alert.alert('Edit Name', 'Feature coming soon!') },
                      { text: 'Edit Description', onPress: () => Alert.alert('Edit Description', 'Feature coming soon!') },
                      { text: 'Change Channel Icon', onPress: () => Alert.alert('Change Icon', 'Feature coming soon!') }
                    ]
                  );
                }
              });
            }

            // Add leave channel option (not for owners)
            if (!isChannelOwner) {
              menuOptions.splice(-1, 0, {
                text: 'Leave Channel',
                onPress: () => {
                  Alert.alert(
                    'Leave Channel',
                    `Are you sure you want to leave ${selectedChannel?.name}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Leave', style: 'destructive', onPress: () => {
                        Alert.alert('Left Channel', 'You have left the channel.');
                        setSelectedChannel(null);
                        setShowChannelList(true);
                      }}
                    ]
                  );
                }
              });
            }

            // Add clear history option
            menuOptions.splice(-1, 0, {
              text: 'Clear Chat History',
              onPress: () => {
                Alert.alert(
                  'Clear History',
                  'This will clear all messages from your view. Continue?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear', onPress: () => setMessages([]) }
                  ]
                );
              }
            });

            // Add report option
            menuOptions.splice(-1, 0, {
              text: 'Report Issue',
              onPress: () => {
                Alert.alert('Report', 'Chat issue reported to administrators.');
              }
            });

            Alert.alert(
              'Chat Options',
              'Choose an action',
              [
                ...menuOptions,
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          }}
        >
          <MoreVertical size={24} color={theme.primary} />
        </TouchableOpacity>
        <View style={styles.resizeControls}>
          <TouchableOpacity 
            style={styles.resizeButton}
            onPress={decreaseChatHeight}
          >
            <Text style={styles.resizeButtonText}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.resizeButton}
            onPress={increaseChatHeight}
          >
            <Text style={styles.resizeButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        extraData={messages.length}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        style={{ height: chatHeight }}

      />

      {/* Typing Indicator - Only shows real users typing */}
      {typingUsers.length > 0 && (
        <View style={styles.typingIndicatorContainer}>
          <Text style={styles.typingIndicatorText}>
            {typingUsers.length === 1 
              ? `${typingUsers[0]} is typing...` 
              : `${typingUsers.slice(0, -1).join(', ')} and ${typingUsers[typingUsers.length - 1]} are typing...`
            }
          </Text>
        </View>
      )}

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
      {isUserBanned ? (
        <View style={styles.bannedContainer}>
          <Text style={styles.bannedMessage}>
            You have been banned from this chat for violating community rules.
          </Text>
          <TouchableOpacity
            style={styles.unbanRequestButton}
            onPress={handleUnbanRequest}
          >
            <Text style={styles.unbanRequestText}>Request Unban</Text>
          </TouchableOpacity>
        </View>
      ) : (
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
            onChangeText={(text) => {
              // Limit to 1000 characters
              if (text.length <= 1000) {
                setNewMessage(text);
              }
            }}
            placeholder="Type a message..."
            placeholderTextColor={theme.textMuted}
            maxLength={1000}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            blurOnSubmit={false}
            multiline
          />
          
          {/* Character counter */}
          {newMessage.length > 800 && (
            <Text style={[
              styles.charCounter, 
              newMessage.length > 950 && styles.charCounterWarning
            ]}>
              {newMessage.length}/1000
            </Text>
          )}            <TouchableOpacity 
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
      )}

      {/* Modern Emoji/GIF Picker */}
      <ModernEmojiPicker
        visible={showEmojiPicker || showGifPicker}
        type={pickerType}
        onSelect={pickerType === 'emoji' ? handleEmojiSelect : handleGifSelect}
        onClose={closePickers}
      />
    </Animated.View>
  );

  const renderChannelList = () => (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => {
              Alert.alert('Search', 'Search functionality coming soon!');
            }}
          >
            <Search size={24} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowModerationPanel(true)}
          >
            <Shield size={24} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={onClose}>
            <X size={24} color={theme.text} />
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

        {/* Reaction Picker */}
        <ReactionPicker
          message={reactingToMessage}
          onSelect={handleReaction}
          onClose={() => setReactingToMessage(null)}
        />

        {/* Message Options Modal */}
        <MessageOptionsModal
          visible={showMessageOptions}
          message={selectedMessageForOptions}
          onClose={() => {
            setShowMessageOptions(false);
            setSelectedMessageForOptions(null);
          }}
          onDelete={handleDeleteMessage}
          onReport={handleReportMessage}
          userRole={user?.role}
          currentUserId={user?.id}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  reactionsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceDark,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },
  userReactedChip: {
    backgroundColor: theme.primary,
    borderColor: theme.primaryLight,
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 12,
    color: theme.textLight,
    fontWeight: '600',
  },
  reactionPickerContainer: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: theme.surface,
    borderRadius: 24,
    padding: 12,
    flexDirection: 'row',
    gap: 16,
    elevation: 15,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: theme.primaryLight,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.secondary,
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
    borderBottomColor: theme.border, // Use dark border
    backgroundColor: theme.surface, // Use dark surface
    elevation: 2,
    shadowColor: theme.secondary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text, // Use light text
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: theme.surfaceDark,
    elevation: 2,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
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
    backgroundColor: theme.surface,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 12,
    elevation: 1,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedChannelItem: {
    backgroundColor: theme.primary,
    borderWidth: 2,
    borderColor: theme.primaryLight,
    transform: [{ scale: 1.02 }],
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
    color: theme.text, // Use light text
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: theme.textLight, // Use lighter gray text
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
    color: theme.text, // Use light text
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
    backgroundColor: theme.surface, // Use dark surface
    elevation: 2,
    shadowColor: theme.secondary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    paddingRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.primaryLight, // Use lighter primary color
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
    color: theme.text, // Use light text
  },
  chatHeaderSubtitle: {
    fontSize: 12,
    color: theme.textLight, // Use lighter gray text
    marginTop: 2,
  },
  typingIndicatorContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    height: 28,
    backgroundColor: theme.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    justifyContent: 'center',
  },
  typingIndicatorText: {
    color: theme.primary,
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  messagesList: {
    padding: 8,
  },
  messageContainer: {
    paddingVertical: 2,
    paddingHorizontal: 12,
  },
  messageText: {
    fontSize: 14,
    color: theme.text,
    lineHeight: 18,
    flex: 1,
  },
  username: {
    fontWeight: '600',
  },
  suggestionsContainer: {
    backgroundColor: theme.surface, // Use dark surface
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingVertical: 8,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    backgroundColor: theme.surfaceDark,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.primary,
    elevation: 2,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
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
    backgroundColor: theme.surface, // Use dark surface
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
    borderWidth: 2,
    borderColor: theme.border,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    maxHeight: 100,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.surfaceDark,
    elevation: 1,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.surfaceDark,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  sendButtonActive: {
    backgroundColor: theme.primary,
    transform: [{ scale: 1.05 }],
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.text,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    width: '100%',
  },
  usernameTouchable: {
    marginRight: 8,
  },
  banButton: {
    padding: 4,
    marginLeft: 8,
  },
  bannedText: {
    fontSize: 12,
    color: theme.error,
    fontStyle: 'italic',
    marginTop: 4,
  },
  bannedContainer: {
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bannedMessage: {
    fontSize: 14,
    color: theme.error,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
  },
  unbanRequestButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 2,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  unbanRequestText: {
    color: theme.background,
    fontSize: 14,
    fontWeight: '600',
  },
  charCounter: {
    position: 'absolute',
    right: 80,
    bottom: 16,
    fontSize: 12,
    color: theme.textMuted,
    backgroundColor: theme.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  charCounterWarning: {
    color: theme.warning,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageOptionsContainer: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 20,
    margin: 20,
    minWidth: 280,
    elevation: 10,
    shadowColor: theme.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  messageOptionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  messageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: theme.surfaceDark,
  },
  messageOptionText: {
    fontSize: 16,
    color: theme.text,
    marginLeft: 12,
    fontWeight: '500',
  },
  cancelOption: {
    backgroundColor: theme.border,
    marginTop: 8,
  },
  cancelOptionText: {
    fontSize: 16,
    color: theme.textMuted,
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
  },
  gifImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginVertical: 4,
    marginHorizontal: 6,
    backgroundColor: '#f0f0f0',
  },
  messageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
    minHeight: 20,
  },
  resizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  resizeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.surfaceDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    elevation: 2,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  resizeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.primary,
  },
});

export default StylishChatScreen;

// Message Options Modal Component
const MessageOptionsModal = ({ 
  visible, 
  message, 
  onClose, 
  onDelete, 
  onReport, 
  userRole,
  currentUserId
}: { 
  visible: boolean; 
  message: ChatMessage | null; 
  onClose: () => void; 
  onDelete: (messageId: string) => void; 
  onReport: (messageId: string) => void; 
  userRole?: string;
  currentUserId?: string;
}) => {
  if (!visible || !message) return null;

  const canModerate = ['moderator', 'admin', 'super_admin'].includes(userRole || '');
  const isOwnMessage = message.sender_id === currentUserId;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.messageOptionsContainer}>
          <Text style={styles.messageOptionsTitle}>Message Options</Text>
          
          {canModerate && (
            <TouchableOpacity 
              style={styles.messageOption}
              onPress={() => {
                Alert.alert(
                  'Delete Message',
                  'Are you sure you want to delete this message? This action cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Delete', 
                      style: 'destructive',
                      onPress: () => onDelete(message.id)
                    }
                  ]
                );
              }}
            >
              <Trash2 size={20} color={theme.error} />
              <Text style={[styles.messageOptionText, { color: theme.error }]}>
                Delete Message
              </Text>
            </TouchableOpacity>
          )}

          {!isOwnMessage && (
            <TouchableOpacity 
              style={styles.messageOption}
              onPress={() => onReport(message.id)}
            >
              <Flag size={20} color={theme.warning} />
              <Text style={[styles.messageOptionText, { color: theme.warning }]}>
                Report Message
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.messageOption, styles.cancelOption]}
            onPress={onClose}
          >
            <Text style={styles.cancelOptionText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// A simple Reaction Picker component
const ReactionPicker = ({ message, onSelect, onClose }: { message: ChatMessage | null, onSelect: (message: ChatMessage, reaction: string) => void, onClose: () => void }) => {
  if (!message) return null;

  const commonReactions = ['❤️', '😂', '👍', '😢', '🔥', '🎉'];

  return (
    <Modal
      visible={!!message}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose}>
        <View style={styles.reactionPickerContainer}>
          {commonReactions.map(emoji => (
            <TouchableOpacity 
              key={emoji} 
              onPress={() => onSelect(message, emoji)}
            >
              <Text style={{ fontSize: 28 }}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};
