import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthProvider';
import { useChat } from '@/contexts/ChatProvider';

interface ChatButtonProps {
  style?: any;
  size?: 'small' | 'medium' | 'large';
  position?: 'fixed' | 'relative';
}

export default function ChatButton({ 
  style, 
  size = 'medium', 
  position = 'fixed' 
}: ChatButtonProps) {
  const { user } = useAuth();
  const { unreadCount, openChat } = useChat();

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          width: 40,
          height: 40,
          borderRadius: 20,
        };
      case 'large':
        return {
          width: 64,
          height: 64,
          borderRadius: 32,
        };
      default:
        return {
          width: 56,
          height: 56,
          borderRadius: 28,
        };
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 20;
      case 'large':
        return 28;
      default:
        return 24;
    }
  };

  if (!user) return null;

  return (
    <TouchableOpacity
      style={[
        styles.chatButton,
        position === 'fixed' && styles.fixedPosition,
        getSizeStyles(),
        style,
      ]}
      onPress={() => openChat()}
    >
      <MessageCircle size={getIconSize()} color="#FFFFFF" />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chatButton: {
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fixedPosition: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
  },
  badge: {
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
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
