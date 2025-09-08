import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { chatService, Conversation, Message } from '@/services/chatService';
import { useAuth } from './AuthProvider';

interface ChatContextType {
  conversations: Conversation[];
  unreadCount: number;
  activeConversation: Conversation | null;
  isChatOpen: boolean;
  isLoading: boolean;
  openChat: (conversationId?: string) => void;
  closeChat: () => void;
  startDirectConversation: (userId: string, username: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  setActiveConversation: (conversation: Conversation | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { user, loading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-refresh unread count every 30 seconds when user is logged in and chat is not open
  useEffect(() => {
    if (!user || loading || isChatOpen) return;

    refreshUnreadCount();
    refreshConversations();

    const interval = setInterval(() => {
      refreshUnreadCount();
      refreshConversations();
    }, 30000);

    return () => clearInterval(interval);
  }, [user, loading, isChatOpen]);

  const refreshConversations = async () => {
    if (!user || loading) return;
    
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Error refreshing conversations:', error);
    }
  };

  const refreshUnreadCount = async () => {
    if (!user || loading) return;
    
    try {
      const count = await chatService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error refreshing unread count:', error);
    }
  };

  const openChat = async (conversationId?: string) => {
    setIsChatOpen(true);
    
    if (conversationId) {
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        setActiveConversation(conversation);
      }
    }
  };

  const closeChat = () => {
    setIsChatOpen(false);
    setActiveConversation(null);
    // Refresh counts when chat is closed
    refreshUnreadCount();
    refreshConversations();
  };

  const startDirectConversation = async (userId: string, username: string) => {
    if (!user || loading) return;
    
    try {
      setIsLoading(true);
      const conversation = await chatService.getOrCreateDirectConversation(userId);
      
      // Add to conversations list if not already there
      setConversations(prev => {
        const exists = prev.find(c => c.id === conversation.id);
        if (!exists) {
          return [{ ...conversation, unread_count: 0 }, ...prev];
        }
        return prev;
      });
      
      setActiveConversation({ ...conversation, unread_count: 0 });
      setIsChatOpen(true);
    } catch (error) {
      console.error('Error starting conversation:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value: ChatContextType = {
    conversations,
    unreadCount,
    activeConversation,
    isChatOpen,
    isLoading,
    openChat,
    closeChat,
    startDirectConversation,
    refreshConversations,
    refreshUnreadCount,
    setActiveConversation,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
