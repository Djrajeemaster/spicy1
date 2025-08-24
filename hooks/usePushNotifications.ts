// src/hooks/usePushNotifications.ts
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthProvider';

type PushTokenRow = {
  token: string;
  user_id: string;
  platform: 'ios' | 'android' | 'web';
  device_id?: string | null;
  app_version?: string | null;
  disabled?: boolean;
  last_seen_at?: string;
};

// ⚠️ Keep Notifications.setNotificationHandler in app/_layout.tsx, not here.

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
}

async function getExpoPushToken(): Promise<string | null> {
  // Real devices only for remote push
  if (!Device.isDevice) return null;

  // Android remote push requires a Dev Build (Expo Go won’t work on SDK 53+)
  if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
    console.warn('Android remote push requires a development build (not Expo Go).');
  }

  // Ask permission
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return null;

  // Get projectId from app config (set by `eas init`)
  const projectId =
    (Constants?.expoConfig?.extra?.eas?.projectId as string) ??
    (Constants?.easConfig?.projectId as string);

  if (!projectId) {
    console.warn('Missing EAS projectId in app config');
    return null;
  }

  // ✅ Pass projectId here
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  return token;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const subRef = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!user?.id) return;
        await ensureAndroidChannel();

        const token = await getExpoPushToken();
        if (!token || cancelled) return;

        const row: PushTokenRow = {
          token,
          user_id: user.id,
          platform: Platform.OS as any,
          device_id: `${Platform.OS}-${Math.random().toString(36).slice(2, 8)}`, // replace with your own stable ID if needed
          app_version: '1.0.0',
          disabled: false,
        };

        await supabase
          .from('push_tokens' as any)
          .upsert(row, { onConflict: 'token' }) // or 'user_id' if you prefer one-token-per-user
          .throwOnError();
      } catch (e) {
        console.error('Push init error:', e);
      }
    })();

    // Handle taps
    if (!subRef.current) {
      subRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
        try {
          const data: any = response?.notification?.request?.content?.data || {};
          if (data?.route) router.push(String(data.route));
        } catch (e) {
          console.error('Notification tap handler error:', e);
        }
      });
    }

    return () => {
      cancelled = true;
      subRef.current?.remove();
      subRef.current = null;
    };
  }, [user?.id]);
}
