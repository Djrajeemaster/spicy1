import { apiClient } from '@/utils/apiClient';
import { config, getApiUrl } from '@/utils/config';

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

export interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'deal_share' | 'system' | 'ping';
  reply_to_id?: string;
  mentioned_users: string[];
  metadata?: any;
  created_at: string;
  updated_at: string;
  edited_at?: string;
  is_deleted: boolean;
  sender: User;
  reply_to?: {
    content: string;
    sender_username: string;
  };
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  reaction: string;
  count: number;
  users: string[];
  user_reacted: boolean;
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
    console.log('🔧 API Base URL from config:', config.API_BASE_URL);
    console.log('🔧 Full URL will be:', getApiUrl('/chat/channels'));
    
    try {
      const response = await apiClient.get('/chat/channels') as any;
      console.log('🔧 Response received:', response);
      
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
    const url = `/api/chat/channels/${channelId}/messages?page=${page}&limit=${limit}`;
    const response = await apiClient.get(url) as any;
    
    // Ensure we always return an array
    if (response && Array.isArray(response.data)) {
      return response.data;
    } else if (response && Array.isArray(response)) {
      return response;
    } else {
      console.warn('🔧 Unexpected response format for getMessages, returning empty array');
      return [];
    }
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
    if (response && response.data) {
      return response.data;
    } else if (response && response.id) {
      return response;
    } else {
      throw new Error('Invalid response from server');
    }
  }

  // Edit a message
  async editMessage(messageId: string, content: string): Promise<Message> {
    const response = await apiClient.put(`/chat/messages/${messageId}`, {
      content
    }) as any;
    return response.data;
  }

  // Delete a message
  async deleteMessage(messageId: string): Promise<void> {
    await apiClient.delete(`/chat/messages/${messageId}`);
  }

  // Add reaction to message
  async addReaction(messageId: string, reaction: string): Promise<void> {
    await apiClient.post(`/chat/messages/${messageId}/reactions`, {
      reaction
    });
  }

  // Remove reaction from message
  async removeReaction(messageId: string, reaction: string): Promise<void> {
    await apiClient.delete(`/chat/messages/${messageId}/reactions`);
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
    const url = `/api/chat/users/search?q=${encodeURIComponent(query)}&limit=${limit}`;
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
    await apiClient.post(`/api/chat/channels/${channelId}/mark-read`);
  }

  // Check if user can send private message
  async canSendPrivateMessage(userId: string): Promise<boolean> {
    const response = await apiClient.get(`/api/chat/can-message/${userId}`) as any;
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

  // Get online users in channel
  async getOnlineUsers(channelId: string): Promise<User[]> {
    const response = await apiClient.get(`/api/chat/channels/${channelId}/online-users`) as any;
    return response.data;
  }
}

export const chatService = new EnhancedChatService();
