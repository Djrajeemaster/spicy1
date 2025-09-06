# Common Chatbox Implementation Guide

## Overview
I've implemented a comprehensive chatbox system for your app that provides real-time messaging capabilities between all users. Here's what's included:

## Features Implemented

### 1. Database Schema
- **Conversations**: Group messages between users
- **Messages**: Store text messages with support for replies
- **Message reactions**: Like/emoji reactions to messages
- **Read status**: Track which messages have been read
- **User search**: Find users to start conversations with

### 2. Backend API Endpoints
Added to `server.js`:
- `GET /api/conversations` - Get user's conversations
- `POST /api/conversations/direct` - Create direct conversation
- `GET /api/conversations/:id/messages` - Get messages
- `POST /api/conversations/:id/messages` - Send message
- `DELETE /api/messages/:id` - Delete message
- `GET /api/users/search-for-chat` - Search users
- `GET /api/messages/unread-count` - Get unread count

### 3. Frontend Components
- **ChatProvider**: Global state management for chat
- **ChatBox**: Main chat interface modal
- **ChatButton**: Floating chat button with unread count
- **GlobalChatOverlay**: App-wide chat overlay
- **useChat hook**: Easy access to chat functionality

### 4. Integration Points
- **User Profiles**: "Message" button to start conversations
- **Main App**: Floating chat button on home screen
- **Global Access**: Chat available from anywhere in the app

## Setup Instructions

### 1. Database Setup
Run the SQL schema to create chat tables:
```bash
# Connect to your PostgreSQL database and run:
psql -d your_database_name -f database/chat_schema.sql
```

### 2. Server Restart
Restart your server to load the new chat endpoints:
```bash
npm start
```

### 3. Test the Chat
1. Sign in with two different user accounts
2. Visit one user's profile and click "Message"
3. Start a conversation
4. Switch to the other account and see the message
5. Use the floating chat button to access conversations

## Usage

### Starting a Conversation
```tsx
import { useChat } from '@/contexts/ChatProvider';

const { startDirectConversation } = useChat();

// Start conversation with a user
await startDirectConversation(userId, username);
```

### Adding Chat Button Anywhere
```tsx
import ChatButton from '@/components/ChatButton';

// Add floating chat button
<ChatButton />

// Or customize it
<ChatButton size="small" position="relative" />
```

### Accessing Chat State
```tsx
import { useChat } from '@/contexts/ChatProvider';

const { 
  conversations, 
  unreadCount, 
  openChat, 
  isChatOpen 
} = useChat();
```

## Customization

### Styling
All styles are in the component files and can be customized:
- Chat button colors and position
- Message bubble appearance
- Chat modal styling

### Features to Add Later
- Group chats
- File/image sharing
- Real-time updates (WebSocket)
- Message encryption
- Chat themes
- Message search
- Voice messages

## Files Created/Modified

### New Files:
- `database/chat_schema.sql` - Database schema
- `services/chatService.ts` - Chat API service
- `contexts/ChatProvider.tsx` - Global chat state
- `components/ChatBox.tsx` - Main chat interface
- `components/ChatButton.tsx` - Chat button component
- `components/GlobalChatOverlay.tsx` - Global chat overlay
- `hooks/useChat.ts` - Chat hook (updated)

### Modified Files:
- `server.js` - Added chat endpoints
- `app/_layout.tsx` - Added ChatProvider
- `app/(tabs)/index.tsx` - Added ChatButton
- `app/users/[username].tsx` - Added Message button

## Database Tables Created
- `conversations` - Chat conversations
- `conversation_participants` - Users in conversations
- `messages` - Chat messages
- `message_reactions` - Message reactions
- `message_read_status` - Read receipts
- `conversation_settings` - User chat preferences

The chat system is now fully integrated and ready to use! Users can message each other directly from any user profile, and the chat is accessible globally through the floating chat button.
