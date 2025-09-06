import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthProvider';
import StylishChatScreen from './StylishChatScreen';

interface ChatButtonProps {
  userId?: string; // If provided, opens direct chat with this user
  size?: number;
  color?: string;
  style?: any;
}

const ChatButton: React.FC<ChatButtonProps> = ({ 
  userId, 
  size = 24, 
  color = '#059669', 
  style 
}) => {
  const { user } = useAuth();
  const [showChat, setShowChat] = useState(false);

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
        setShowChat(true);
      } catch (error) {
        console.error('Error creating private chat:', error);
        Alert.alert('Error', 'Failed to start chat. Please try again.');
      }
    } else {
      // Open general chat screen
      setShowChat(true);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, style]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <MessageCircle size={size} color={color} />
      </TouchableOpacity>
      
      <StylishChatScreen
        visible={showChat}
        onClose={() => setShowChat(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatButton;
