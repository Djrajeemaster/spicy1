import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  MessageCircle,
  Send,
  Search,
  X,
  ArrowLeft,
  MoreVertical,
  Trash2,
  Reply,
  Users,
  Minimize2,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthProvider';
import { useChat } from '@/contexts/ChatProvider';
import { chatService, Conversation, Message, User } from '@/services/chatService';

interface ChatBoxProps {
  style?: any;
}

export default function ChatBox({ style }: ChatBoxProps) {
  const { user } = useAuth();
  const { 
    conversations, 
    unreadCount, 
    activeConversation, 
    isChatOpen,
    isLoading: chatLoading,
    openChat,
    closeChat,
    refreshConversations,
    setActiveConversation 
  } = useChat();
  
  const [currentView, setCurrentView] = useState<'conversations' | 'chat' | 'newChat'>('conversations');
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [searchUsers, setSearchUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (activeConversation && currentView === 'conversations') {
      setCurrentView('chat');
      loadMessages(activeConversation.id);
    }
  }, [activeConversation]);

  const loadMessages = async (conversationId: string) => {
    try {
      setLoading(true);
      const data = await chatService.getMessages(conversationId);
      setMessages(data);
      
      // Scroll to bottom after loading
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleConversationSelect = async (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setActiveConversation(conversation);
      setCurrentView('chat');
      await loadMessages(conversationId);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeConversation || sending) return;

    try {
      setSending(true);
      const newMessage = await chatService.sendMessage(
        activeConversation.id,
        messageText.trim(),
        'text',
        replyingTo?.id
      );
      
      setMessages(prev => [...prev, newMessage]);
      setMessageText('');
      setReplyingTo(null);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      // Refresh conversations to update last message
      await refreshConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleNewChat = async () => {
    setCurrentView('newChat');
    setSearchQuery('');
    setSearchUsers([]);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const handleUserSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchUsers([]);
      return;
    }

    try {
      const users = await chatService.searchUsers(query);
      setSearchUsers(users);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleStartConversation = async (otherUser: User) => {
    try {
      setLoading(true);
      const conversation = await chatService.getOrCreateDirectConversation(otherUser.id);
      setActiveConversation({
        ...conversation,
        unread_count: 0
      });
      setCurrentView('chat');
      await loadMessages(conversation.id);
      await refreshConversations();
    } catch (error) {
      console.error('Error starting conversation:', error);
      Alert.alert('Error', 'Failed to start conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await chatService.deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('Error', 'Failed to delete message');
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => handleConversationSelect(item.id)}
    >
      <View style={styles.conversationAvatar}>
        <Text style={styles.conversationAvatarText}>
          {item.display_name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.conversationInfo}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {item.display_name}
          </Text>
          {item.last_message_created_at && (
            <Text style={styles.conversationTime}>
              {formatMessageTime(item.last_message_created_at)}
            </Text>
          )}
        </View>
        <View style={styles.conversationFooter}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.last_message_content || 'No messages yet'}
          </Text>
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>
                {item.unread_count > 99 ? '99+' : item.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.id;
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        {!isOwnMessage && (
          <Text style={styles.messageSender}>{item.sender_username}</Text>
        )}
        
        {item.reply_to_id && (
          <View style={styles.replyContainer}>
            <Text style={styles.replyText}>
              Replying to {item.reply_to_sender}: {item.reply_to_content}
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
          <Text style={[
            styles.messageTime,
            isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
          ]}>
            {new Date(item.created_at).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit', 
              hour12: false 
            })}
          </Text>
        </View>
        
        {isOwnMessage && (
          <TouchableOpacity
            style={styles.messageOptions}
            onPress={() => {
              Alert.alert(
                'Message Options',
                'What would you like to do?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Reply', 
                    onPress: () => setReplyingTo(item)
                  },
                  { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: () => handleDeleteMessage(item.id)
                  },
                ]
              );
            }}
          >
            <MoreVertical size={16} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderUserSearchItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userSearchItem}
      onPress={() => handleStartConversation(item)}
    >
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>
          {item.username.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.userName}>{item.username}</Text>
    </TouchableOpacity>
  );

  if (!user) return null;

  return (
    <>
      {/* Chat Toggle Button */}
      <TouchableOpacity
        style={[styles.chatToggle, style]}
        onPress={() => openChat()}
      >
        <MessageCircle size={24} color="#FFFFFF" />
        {unreadCount > 0 && (
          <View style={styles.chatToggleBadge}>
            <Text style={styles.chatToggleBadgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal
        visible={isChatOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeChat}
      >
        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                if (currentView === 'conversations') {
                  closeChat();
                } else {
                  setCurrentView('conversations');
                  setActiveConversation(null);
                  setMessages([]);
                  setReplyingTo(null);
                }
              }}
            >
              {currentView === 'conversations' ? (
                <X size={24} color="#FFFFFF" />
              ) : (
                <ArrowLeft size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>
              {currentView === 'conversations' && 'Messages'}
              {currentView === 'chat' && activeConversation?.display_name}
              {currentView === 'newChat' && 'New Message'}
            </Text>
            
            {currentView === 'conversations' && (
              <TouchableOpacity onPress={handleNewChat}>
                <Users size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          {currentView === 'conversations' && (
            <View style={styles.content}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#6366f1" />
                  <Text style={styles.loadingText}>Loading conversations...</Text>
                </View>
              ) : (
                <FlatList
                  data={conversations}
                  keyExtractor={(item) => item.id}
                  renderItem={renderConversationItem}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.conversationsList}
                />
              )}
            </View>
          )}

          {currentView === 'newChat' && (
            <View style={styles.content}>
              <View style={styles.searchContainer}>
                <Search size={20} color="#6b7280" style={styles.searchIcon} />
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  placeholder="Search users..."
                  value={searchQuery}
                  onChangeText={handleUserSearch}
                  autoCapitalize="none"
                />
              </View>
              
              <FlatList
                data={searchUsers}
                keyExtractor={(item) => item.id}
                renderItem={renderUserSearchItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.userSearchList}
              />
            </View>
          )}

          {currentView === 'chat' && (
            <View style={styles.content}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#6366f1" />
                  <Text style={styles.loadingText}>Loading messages...</Text>
                </View>
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  keyExtractor={(item) => item.id}
                  renderItem={renderMessage}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.messagesList}
                  onContentSizeChange={() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                  }}
                />
              )}
              
              {/* Reply Preview */}
              {replyingTo && (
                <View style={styles.replyPreview}>
                  <View style={styles.replyPreviewContent}>
                    <Text style={styles.replyPreviewText}>
                      Replying to {replyingTo.sender_username}: {replyingTo.content}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setReplyingTo(null)}
                    style={styles.replyPreviewClose}
                  >
                    <X size={16} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Message Input */}
              <View style={styles.messageInputContainer}>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Type a message..."
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                  maxLength={1000}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!messageText.trim() || sending) && styles.sendButtonDisabled
                  ]}
                  onPress={handleSendMessage}
                  disabled={!messageText.trim() || sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Send size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chatToggle: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  chatToggleBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  chatToggleBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
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
    marginTop: 12,
    color: '#6b7280',
    fontSize: 16,
  },
  conversationsList: {
    padding: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  conversationAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  conversationAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  conversationTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  userSearchList: {
    padding: 16,
  },
  userSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageSender: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    marginLeft: 8,
  },
  replyContainer: {
    backgroundColor: '#f3f4f6',
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 4,
    maxWidth: '80%',
  },
  replyText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  ownMessageBubble: {
    backgroundColor: '#6366f1',
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#1f2937',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#9ca3af',
  },
  messageOptions: {
    marginTop: 4,
    padding: 4,
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  replyPreviewClose: {
    padding: 4,
    marginLeft: 8,
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
    color: '#1f2937',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
});
