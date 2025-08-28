import { supabase } from '@/lib/supabase';

export type Elevation = { token: string; valid_until: string };

export async function elevate(ttlMinutes = 10): Promise<Elevation> {
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-elevate`;
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  
  console.log('Elevation attempt:', {
    hasSession: !!session.session,
    hasJWT: !!jwt,
    userEmail: session.session?.user?.email,
    url
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify({ ttl_minutes: ttlMinutes })
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    console.error('Elevation failed:', {
      status: res.status,
      statusText: res.statusText,
      error: errorText
    });
    throw new Error(`elevate failed: ${res.status} ${errorText}`);
  }

  const result = await res.json();
  console.log('Elevation successful:', { token: result.token.substring(0, 20) + '...', valid_until: result.valid_until });
  return result;
}
