import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-url-polyfill/auto';
import { AuthProvider } from '@/contexts/AuthProvider';
import { CurrencyProvider } from '@/contexts/CurrencyProvider';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function PushInit() {
  usePushNotifications();
  return null;
}

function FrameworkInit() {
  useFrameworkReady();
  return null;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CurrencyProvider>
          <PushInit />
          <FrameworkInit />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </CurrencyProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
