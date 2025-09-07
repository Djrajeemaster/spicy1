import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-url-polyfill/auto';
import { AuthProvider } from '@/contexts/AuthProvider';
import { CurrencyProvider } from '@/contexts/CurrencyProvider';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { ChatProvider } from '@/contexts/ChatProvider';
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
  // Inject Google Fonts links on web so selected fonts (Inter, Poppins, Rubik, Manrope) are available
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const already = document.getElementById('spicy-fonts');
      if (!already) {
        const pre1 = document.createElement('link');
        pre1.rel = 'preconnect';
        pre1.href = 'https://fonts.googleapis.com';
        pre1.id = 'spicy-fonts-pre1';
        document.head.appendChild(pre1);

        const pre2 = document.createElement('link');
        pre2.rel = 'preconnect';
        pre2.href = 'https://fonts.gstatic.com';
        pre2.crossOrigin = 'anonymous';
        pre2.id = 'spicy-fonts-pre2';
        document.head.appendChild(pre2);

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  // Expanded font list to cover admin preview and common UI fonts used by admins
  link.href = 'https://fonts.googleapis.com/css2?&family=Inter:wght@300;400;600;700&family=Poppins:wght@400;600;700&family=Rubik:wght@400;500;600&family=Manrope:wght@400;600&family=Montserrat:wght@400;700&family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Nunito:wght@400;700&family=Raleway:wght@400;700&family=Oswald:wght@400;700&family=Merriweather:wght@400;700&family=Source+Sans+3:wght@400;700&family=Work+Sans:wght@400;700&family=Quicksand:wght@400;700&display=swap';
  link.id = 'spicy-fonts';
  document.head.appendChild(link);
      }
    } catch (e) { /* ignore on non-web platforms */ }
  }
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatProvider>
          <CurrencyProvider>
            <PushInit />
            <FrameworkInit />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="users/[username]" />
              <Stack.Screen name="deal-details" />
            </Stack>
            <StatusBar style="auto" />
          </CurrencyProvider>
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
