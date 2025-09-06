import { apiClient } from '@/utils/apiClient';

export interface User {
  id: string;
  username: string;
  avatar_url?: string;
  role: string;
}

export interface Message {
  id: string;
  content: string;
  message_type: string;
  created_at: string;
  updated_at: string;
  edited_at?: string;
  reply_to_id?: string;
  metadata?: any;
  sender_id: string;
  sender_username: string;
  sender_avatar?: string;
  reply_to_content?: string;
  reply_to_sender?: string;
}

export interface Conversation {
  id: string;
  type: string;
  name?: string;
  description?: string;
  created_at: string;
  last_message_at: string;
  is_active: boolean;
  last_message_content?: string;
  last_message_type?: string;
  last_message_created_at?: string;
  last_message_sender?: string;
  display_name: string;
  other_user_id?: string;
  unread_count: number;
}

class ChatService {
  // Get user's conversations
  async getConversations(): Promise<Conversation[]> {
    const response = await apiClient.get('/api/conversations') as any;
    return response.data;
  }

  // Get or create direct conversation with another user
  async getOrCreateDirectConversation(otherUserId: string): Promise<Conversation> {
    const response = await apiClient.post('/api/conversations/direct', {
      otherUserId
    }) as any;
    return response.data;
  }

  // Get messages for a conversation
  async getMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<Message[]> {
    const url = `/api/conversations/${conversationId}/messages?page=${page}&limit=${limit}`;
    const response = await apiClient.get(url) as any;
    return response.data;
  }

  // Send a message
  async sendMessage(
    conversationId: string,
    content: string,
    messageType: string = 'text',
    replyToId?: string,
    metadata?: any
  ): Promise<Message> {
    const response = await apiClient.post(`/api/conversations/${conversationId}/messages`, {
      content,
      messageType,
      replyToId,
      metadata
    }) as any;
    return response.data;
  }

  // Delete a message
  async deleteMessage(messageId: string): Promise<void> {
    await apiClient.delete(`/api/messages/${messageId}`);
  }

  // Search users for starting new conversations
  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    const url = `/api/users/search-for-chat?q=${encodeURIComponent(query)}&limit=${limit}`;
    const response = await apiClient.get(url) as any;
    return response.data;
  }

  // Get unread message count
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get('/api/messages/unread-count') as any;
    return response.data.count;
  }

  // Share a deal in chat
  async shareDeal(conversationId: string, dealId: string, message?: string): Promise<Message> {
    const content = message || 'Check out this deal!';
    const metadata = {
      deal_id: dealId,
      type: 'deal_share'
    };
    
    return this.sendMessage(conversationId, content, 'deal_share', undefined, metadata);
  }
}

export const chatService = new ChatService();
