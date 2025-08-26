
import { supabase } from '@/lib/supabase';

export async function sendPushToUser(userId: string, payload: { title: string; body: string; data?: any }) {
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-push`;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ user_id: userId, title: payload.title, body: payload.body, data: payload.data || {} }),
  });
}
