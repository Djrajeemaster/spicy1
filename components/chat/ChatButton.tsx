import React from 'react';
import { TouchableOpacity, StyleSheet, Alert, View, Text } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthProvider';
import { useChat } from '../../contexts/ChatProvider';
import StylishChatScreen from './StylishChatScreen';

interface ChatButtonProps {
  userId?: string; // If provided, opens direct chat with this user
  size?: number;
  color?: string;
  style?: any;
}

const ChatButton: React.FC<ChatButtonProps> = ({ 
  userId, 
  size = 28, 
  color = '#ffffff', 
  style 
}) => {
  const { user } = useAuth();
  const { openChat, closeChat, isChatOpen, unreadCount } = useChat();

  const handlePress = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to use chat features');
      return;
    }

    if (userId && userId === user.id) {
      Alert.alert('Cannot Chat', 'You cannot start a chat with yourself');
      return;
    }

    if (userId) {
      // Create or open private chat with specific user
      try {
        const response = await fetch('/api/chat/private', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ other_user_id: userId }),
        });

        if (!response.ok) {
          throw new Error('Failed to create chat');
        }

        // Open chat screen directly to this conversation
        openChat();
      } catch (error) {
        console.error('Error creating private chat:', error);
        Alert.alert('Error', 'Failed to start chat. Please try again.');
      }
    } else {
      // Open general chat screen
      openChat();
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.floatingButton, style]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <MessageCircle size={size} color={color} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount.toString()}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      
      <StylishChatScreen
        visible={isChatOpen}
        onClose={closeChat}
      />
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 1000,
  },
  button: {
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ChatButton;
