import { useChat as useChatContext } from '@/contexts/ChatProvider';
import { Alert } from 'react-native';

export const useChat = () => {
  const chatContext = useChatContext();

  const shareDealsInChat = async (dealId: string, message?: string) => {
    try {
      // This would open a dialog to select which conversation to share to
      // For now, we'll just show an alert
      Alert.alert(
        'Share Deal',
        'This feature will allow you to share deals in your conversations.',
        [
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('Error sharing deal:', error);
      Alert.alert('Error', 'Failed to share deal');
    }
  };

  return {
    ...chatContext,
    shareDealsInChat,
  };
};
