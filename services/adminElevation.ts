import { supabase } from '@/lib/supabase';

export async function elevate(ttlMinutes: number = 10): Promise<string> {
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-elevate`;
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;

  if (!jwt) {
    throw new Error('Not authenticated. Please sign in to request admin elevation.');
  }

  console.log('Requesting admin elevation...', {
    hasJWT: !!jwt,
    ttlMinutes,
    jwtPreview: jwt ? `${jwt.substring(0, 20)}...` : 'none'
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
    },
    body: JSON.stringify({ ttl_minutes: ttlMinutes }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    
    if (response.status === 401) {
      throw new Error('Unauthorized: Your session has expired. Please sign in again.');
    } else if (response.status === 403) {
      throw new Error('Forbidden: You do not have admin privileges. Please contact an administrator.');
    }
    
    console.error('Admin elevation failed:', {
      status: response.status,
      statusText: response.statusText,
      errorText,
      url
    });
    
    throw new Error(`Admin elevation failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
  }

  const data = await response.json();
  console.log('Admin elevation successful');
  return data.token;
}
