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
    const response = await apiClient.get('/api/chat/channels') as any;
    const channels = response.data || response;
    
    // Map server response to Conversation interface
    return channels.map((channel: any) => ({
      id: channel.id,
      type: channel.type,
      name: channel.name,
      description: channel.description,
      created_at: channel.created_at,
      last_message_at: channel.last_message_time,
      is_active: channel.is_active,
      last_message_content: channel.last_message,
      last_message_type: 'text', // Default to text
      last_message_created_at: channel.last_message_time,
      last_message_sender: channel.last_sender,
      display_name: channel.display_name,
      other_user_id: channel.type === 'private' ? channel.other_user_id : undefined,
      unread_count: 0 // TODO: Implement unread count
    }));
  }

  // Get or create direct conversation with another user
  async getOrCreateDirectConversation(otherUserId: string): Promise<Conversation> {
    const response = await apiClient.post('/api/chat/private', {
      other_user_id: otherUserId
    }) as any;
    return response.data;
  }

  // Get messages for a conversation
  async getMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<Message[]> {
    const url = `/api/chat/channels/${conversationId}/messages?page=${page}&limit=${limit}`;
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
    const response = await apiClient.post(`/api/chat/channels/${conversationId}/messages`, {
      content,
      message_type: messageType,
      reply_to_id: replyToId,
      metadata
    }) as any;
    return response.data;
  }

  // Delete a message
  async deleteMessage(messageId: string): Promise<void> {
    // TODO: Implement message deletion endpoint on server
    console.warn('Message deletion not yet implemented on server');
    // await apiClient.delete(`/api/chat/messages/${messageId}`);
  }

  // Search users for starting new conversations
  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    const url = `/api/users/search-for-chat?q=${encodeURIComponent(query)}&limit=${limit}`;
    const response = await apiClient.get(url) as any;
    return response.data;
  }

  // Get unread message count
  async getUnreadCount(): Promise<number> {
    try {
      // TODO: Implement unread count endpoint on server
      // For now, return 0 to avoid errors
      return 0;
      // const response = await apiClient.get('/api/messages/unread-count') as any;
      // return response.data.count;
    } catch (error) {
      console.warn('Unread count not yet implemented:', error);
      return 0;
    }
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
