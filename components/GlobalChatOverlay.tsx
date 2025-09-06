import React from 'react';
import { useChat } from '@/contexts/ChatProvider';
import ChatBox from './ChatBox';

export default function GlobalChatOverlay() {
  const { isChatOpen } = useChat();

  if (!isChatOpen) return null;

  return <ChatBox />;
}
