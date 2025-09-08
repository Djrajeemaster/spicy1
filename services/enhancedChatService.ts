import { apiClient } from '@/utils/apiClient';
import { config, getApiUrl } from '@/utils/config';
import { userService } from './userService';

export interface User {
  id: string;
  username: string;
  avatar_url?: string;
  role: string;
  is_online?: boolean;
}

export interface ChatChannel {
  id: string;
  name?: string;
  description?: string;
  type: 'private' | 'group' | 'global';
  is_global: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  last_message_at: string;
  member_count: number;
  other_user?: User; // For private chats
  unread_count: number;
  last_message?: {
    content: string;
    sender_username: string;
    created_at: string;
  };
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'deal_share' | 'system' | 'ping' | 'gif';
  reply_to_id?: string;
  mentioned_users: string[];
  metadata?: any;
  created_at: string;
  updated_at: string;
  edited_at?: string;
  read_at?: string; // Add read_at property
  is_deleted: boolean;
  sender?: User;
  sender_username?: string; // Add optional sender_username
  reply_to?: {
    content: string;
    sender_username: string;
  };
  reactions?: MessageReaction[];
}

export interface ChatBan {
  id: string;
  user_id: string;
  channel_id?: string; // null for global ban
  banned_by: string;
  reason: string;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
}

export interface UnbanRequest {
  id: string;
  user_id: string;
  requested_at: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface ChatRequest {
  id: string;
  requester_id: string;
  recipient_id: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'ignored';
  created_at: string;
  responded_at?: string;
  expires_at: string;
  requester: User;
}

export interface ChatBan {
  id: string;
  user_id: string;
  channel_id?: string; // null for global ban
  banned_by: string;
  reason: string;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
}

export interface UnbanRequest {
  id: string;
  user_id: string;
  requested_at: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface UserChatPreferences {
  allow_private_messages: boolean;
  require_request_for_private: boolean;
  auto_accept_requests_from_followers: boolean;
  show_online_status: boolean;
  notifications_enabled: boolean;
  sound_enabled: boolean;
}

class EnhancedChatService {
  // === CHANNELS ===
  
  // Get all user's channels
  async getChannels(): Promise<ChatChannel[]> {
    console.log('🔧 Calling getChannels endpoint');
    try {
      const response = await apiClient.get('/chat/channels') as any;
      console.log('🔧 Response received');
      
      // Ensure we always return an array
      if (response && Array.isArray(response.data)) {
        return response.data;
      } else if (response && Array.isArray(response)) {
        return response;
      } else {
        console.warn('🔧 Unexpected response format, returning empty array');
        return [];
      }
    } catch (error) {
      console.error('🔧 Error in getChannels:', error);
      throw error;
    }
  }

  // Get global chat channel
  async getGlobalChannel(): Promise<ChatChannel> {
    const response = await apiClient.get('/chat/channels/global') as any;
    return response.data;
  }

  // Get or create private channel with another user
  async getOrCreatePrivateChannel(userId: string): Promise<ChatChannel> {
    const response = await apiClient.post('/chat/private', {
      userId
    }) as any;
    return response.data;
  }

  // === MESSAGES ===
  
  // Get messages for a channel
  async getMessages(channelId: string, page: number = 1, limit: number = 50): Promise<Message[]> {
    const url = `/chat/channels/${channelId}/messages?page=${page}&limit=${limit}`;
    const response = await apiClient.get(url) as any;
    
    // Ensure we always return an array
    let messages: Message[] = [];
    if (response && Array.isArray(response.data)) {
      messages = response.data;
    } else if (response && Array.isArray(response)) {
      messages = response;
    } else {
      console.warn('🔧 Unexpected response format for getMessages, returning empty array');
      return [];
    }

    // Populate sender information for each message
    const populatedMessages = await this.populateSenderInfo(messages);
    return populatedMessages;
  }

  // Helper method to populate sender information
  private async populateSenderInfo(messages: Message[]): Promise<Message[]> {
    const userCache = new Map<string, User>();
    
    const populatedMessages = await Promise.all(
      messages.map(async (message) => {
        if (!message.sender_id) {
          return message;
        }

        // Check cache first
        if (userCache.has(message.sender_id)) {
          return {
            ...message,
            sender: userCache.get(message.sender_id)
          };
        }

        // Fetch user information
        try {
          const [error, userProfile] = await userService.getUserById(message.sender_id);
          if (!error && userProfile) {
            const user: User = {
              id: userProfile.id,
              username: userProfile.username,
              avatar_url: userProfile.avatar_url,
              role: userProfile.role,
              is_online: false // We don't have this info from the profile
            };
            userCache.set(message.sender_id, user);
            return {
              ...message,
              sender: user
            };
          }
        } catch (error) {
          console.error('Error fetching sender info for message:', message.id, error);
        }

        return message;
      })
    );

    return populatedMessages;
  }

  // Send a message
  async sendMessage(
    channelId: string,
    content: string,
    messageType: string = 'text',
    replyToId?: string,
    mentionedUsers: string[] = [],
    metadata?: any
  ): Promise<Message> {
    const response = await apiClient.post(`/chat/channels/${channelId}/messages`, {
      content,
      messageType,
      replyToId,
      mentioned_users: mentionedUsers,
      metadata
    }) as any;
    
    // Ensure we return a valid message object
    let message: Message;
    if (response && response.data) {
      message = response.data;
    } else if (response && response.id) {
      message = response;
    } else {
      throw new Error('Invalid response from server');
    }

    // Populate sender information if not present
    if (message.sender_id && !message.sender) {
      try {
        const [error, userProfile] = await userService.getUserById(message.sender_id);
        if (!error && userProfile) {
          message.sender = {
            id: userProfile.id,
            username: userProfile.username,
            avatar_url: userProfile.avatar_url,
            role: userProfile.role,
            is_online: false
          };
        }
      } catch (error) {
        console.error('Error fetching sender info for sent message:', error);
      }
    }

    return message;
  }

  // Edit a message
  async editMessage(messageId: string, content: string): Promise<Message> {
    const response = await apiClient.put(`/chat/messages/${messageId}`, {
      content
    }) as any;
    return response.data;
  }

  // Delete a message (admin/moderator only)
  async deleteMessage(messageId: string, reason?: string): Promise<void> {
    await apiClient.delete(`/chat/messages/${messageId}`);
  }

  // Start typing indicator
  async startTyping(channelId: string): Promise<void> {
    // This would typically emit a WebSocket event.
    // In a real implementation, you'd have something like:
    // socket.emit('typing:start', { channelId });
    console.log(`User started typing in channel ${channelId}`);
  }

  // Stop typing indicator
  async stopTyping(channelId: string): Promise<void> {
    // This would typically emit a WebSocket event.
    // In a real implementation, you'd have something like:
    // socket.emit('typing:stop', { channelId });
    console.log(`User stopped typing in channel ${channelId}`);
  }

  // Add reaction to message
  async addReaction(messageId: string, reaction: string): Promise<Message> {
    const response = await apiClient.post(`/chat/messages/${messageId}/reactions`, {
      reaction
    }) as any;
    return response.data;
  }

  // Remove reaction from message
  async removeReaction(messageId: string, reaction: string): Promise<Message> {
    const response = await apiClient.delete(`/chat/messages/${messageId}/reactions/${reaction}`) as any;
    return response.data;
  }

  // === CHAT REQUESTS ===
  
  // Send chat request to user
  async sendChatRequest(userId: string, message?: string): Promise<ChatRequest> {
    const response = await apiClient.post('/chat/requests', {
      recipientId: userId,
      message
    }) as any;
    return response.data;
  }

  // Get incoming chat requests
  async getIncomingRequests(): Promise<ChatRequest[]> {
    const response = await apiClient.get('/chat/requests') as any;
    return response.data;
  }

  // Get outgoing chat requests
  async getOutgoingRequests(): Promise<ChatRequest[]> {
    const response = await apiClient.get('/chat/requests') as any;
    return response.data;
  }

  // Respond to chat request
  async respondToChatRequest(requestId: string, action: 'accept' | 'reject' | 'ignore'): Promise<void> {
    await apiClient.put(`/chat/requests/${requestId}`, {
      action
    });
  }

  // === USER BLOCKING ===
  
  // Block a user
  async blockUser(userId: string, reason?: string): Promise<void> {
    await apiClient.post('/chat/block', {
      userId,
      reason
    });
  }

  // Unblock a user
  async unblockUser(userId: string): Promise<void> {
    await apiClient.delete(`/chat/block/${userId}`);
  }

  // Get blocked users
  async getBlockedUsers(): Promise<User[]> {
    const response = await apiClient.get('/chat/blocked') as any;
    return response.data;
  }

  // Check if user is blocked
  async isUserBlocked(userId: string): Promise<boolean> {
    try {
      const response = await apiClient.get(`/chat/blocked`) as any;
      const blockedUsers = response.data;
      return blockedUsers.some((user: User) => user.id === userId);
    } catch {
      return false;
    }
  }

  // === USER PREFERENCES ===
  
  // Get user chat preferences
  async getChatPreferences(): Promise<UserChatPreferences> {
    const response = await apiClient.get('/chat/preferences') as any;
    return response.data;
  }

  // Update user chat preferences
  async updateChatPreferences(preferences: Partial<UserChatPreferences>): Promise<UserChatPreferences> {
    const response = await apiClient.put('/chat/preferences', preferences) as any;
    return response.data;
  }

  // === UTILITIES ===
  
  // Search users for chat
  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    const url = `/chat/users/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    const response = await apiClient.get(url) as any;
    return response.data;
  }

  // Get unread message count
  async getUnreadCount(): Promise<number> {
    // TODO: Implement unread count endpoint
    return 0;
  }

  // Mark messages as read
  async markMessagesAsRead(channelId: string): Promise<void> {
    await apiClient.post(`/chat/channels/${channelId}/mark-read`);
  }

  // Check if user can send private message
  async canSendPrivateMessage(userId: string): Promise<boolean> {
    const response = await apiClient.get(`/chat/can-message/${userId}`) as any;
    return response.data.canMessage;
  }

  // Share deal in chat
  async shareDeal(channelId: string, dealId: string, message?: string): Promise<Message> {
    const content = message || 'Check out this deal! 🔥';
    const metadata = {
      deal_id: dealId,
      type: 'deal_share'
    };
    
    return this.sendMessage(channelId, content, 'deal_share', undefined, undefined, metadata);
  }

  // Ping user in message
  async pingUser(channelId: string, userId: string, message: string): Promise<Message> {
    return this.sendMessage(
      channelId, 
      message, 
      'ping', 
      undefined, 
      [userId]
    );
  }

  // === MESSAGE MANAGEMENT ===

  // Clean up old messages (keep only last 100)
  async cleanupOldMessages(channelId: string): Promise<void> {
    try {
      await apiClient.post(`/chat/channels/${channelId}/cleanup`, {
        keep_count: 100
      });
    } catch (error) {
      console.error('Error cleaning up old messages:', error);
    }
  }

  // Get messages with automatic cleanup (for private chats too)
  async getPrivateMessagesWithCleanup(channelId: string, page: number = 1, limit: number = 50): Promise<Message[]> {
    // First cleanup old messages
    await this.cleanupOldMessages(channelId);

    // Then get messages
    return this.getMessages(channelId, page, limit);
  }

  // === BANNING SYSTEM ===

  // Ban user from chat (moderator/admin/superadmin only)
  async banUserFromChat(userId: string, reason: string, channelId?: string, duration?: number): Promise<ChatBan> {
    try {
      const response = await apiClient.post('/chat/ban', {
        userId,
        reason,
        channelId,
        duration_days: duration
      }) as any;
      return response.data;
    } catch (error) {
      console.warn('Ban functionality not available:', error);
      throw new Error('Ban functionality is not currently available');
    }
  }

  // Unban user from chat
  async unbanUserFromChat(banId: string): Promise<void> {
    try {
      await apiClient.delete(`/chat/ban/${banId}`);
    } catch (error) {
      console.warn('Unban functionality not available:', error);
      throw new Error('Unban functionality is not currently available');
    }
  }

  // Get banned users
  async getBannedUsers(channelId?: string): Promise<ChatBan[]> {
    try {
      const url = channelId ? `/chat/bans?channel_id=${channelId}` : '/chat/bans';
      const response = await apiClient.get(url) as any;
      return response.data || [];
    } catch (error) {
      console.warn('Ban endpoint not available:', error);
      return [];
    }
  }

  // Check if user is banned
  async isUserBanned(userId: string, channelId?: string): Promise<boolean> {
    try {
      const bans = await this.getBannedUsers(channelId);
      return bans.some(ban => ban.user_id === userId && ban.is_active);
    } catch {
      return false;
    }
  }

  // === UNBAN REQUESTS ===

  // Request unban
  async requestUnban(reason: string): Promise<UnbanRequest> {
    try {
      const response = await apiClient.post('/chat/unban-request', {
        reason
      }) as any;
      return response.data;
    } catch (error) {
      console.warn('Unban request functionality not available:', error);
      throw new Error('Unban request functionality is not currently available');
    }
  }

  // Get unban requests (for moderators/admins)
  async getUnbanRequests(): Promise<UnbanRequest[]> {
    try {
      const response = await apiClient.get('/chat/unban-requests') as any;
      return response.data || [];
    } catch (error) {
      console.warn('Unban requests functionality not available:', error);
      return [];
    }
  }

  // Respond to unban request
  async respondToUnbanRequest(requestId: string, action: 'approve' | 'reject'): Promise<void> {
    try {
      await apiClient.put(`/chat/unban-requests/${requestId}`, {
        action
      });
    } catch (error) {
      console.warn('Respond to unban request functionality not available:', error);
      throw new Error('Respond to unban request functionality is not currently available');
    }
  }

  // === SPAM CONTROL AND VALIDATION ===

  // Validate message content
  validateMessageContent(content: string): { isValid: boolean; error?: string } {
    // Check for spam patterns
    const spamPatterns = [
      /(.)\1{10,}/, // Repeated characters
      /\b(?:http|https|www\.)\S+/gi, // URLs (except saversdream)
      /\b\d{10,}\b/g, // Long numbers (potential phone numbers)
    ];

    // Allow saversdream URLs
    const saversdreamPattern = /https?:\/\/(?:www\.)?saversdream\.com\/\S*/gi;

    // Remove allowed saversdream URLs from content for spam check
    let cleanContent = content.replace(saversdreamPattern, '');

    for (const pattern of spamPatterns) {
      if (pattern.test(cleanContent)) {
        return {
          isValid: false,
          error: 'Message contains prohibited content or spam patterns'
        };
      }
    }

    // Check message length
    if (content.length > 1000) {
      return {
        isValid: false,
        error: 'Message is too long (max 1000 characters)'
      };
    }

    // Check for excessive caps
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.7 && content.length > 10) {
      return {
        isValid: false,
        error: 'Please avoid excessive use of capital letters'
      };
    }

    return { isValid: true };
  }

  // Send validated message
  async sendValidatedMessage(
    channelId: string,
    content: string,
    messageType: string = 'text',
    replyToId?: string,
    mentionedUsers: string[] = [],
    metadata?: any
  ): Promise<Message> {
    // Validate content
    const validation = this.validateMessageContent(content);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Check if user is banned
    const currentUser = await this.getCurrentUser();
    if (currentUser) {
      const isBanned = await this.isUserBanned(currentUser.id, channelId);
      if (isBanned) {
        throw new Error('You are banned from this chat');
      }
    }

    return this.sendMessage(channelId, content, messageType, replyToId, mentionedUsers, metadata);
  }

  // Get current user (helper method)
  private async getCurrentUser(): Promise<User | null> {
    try {
      // This would typically come from auth context
      // For now, return null and handle ban check differently
      return null;
    } catch {
      return null;
    }
  }

  // Get online users in channel
  async getOnlineUsers(channelId: string): Promise<{count: number, users: User[]}> {
    const response = await apiClient.get(`/chat/channels/${channelId}/online-users`) as any;
    return response.data || { count: 0, users: [] };
  }
}

export const chatService = new EnhancedChatService();
