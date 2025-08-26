import { supabase } from '@/lib/supabase';

export async function startImpersonation(targetUserId: string, elevationToken: string) {
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-impersonate-start`;
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      'x-admin-elevation': elevationToken,
    },
    body: JSON.stringify({ target_user_id: targetUserId }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`impersonate-start failed: ${res.status} ${t}`);
  }
  return res.json() as Promise<{ token: string; valid_until: string }>;
}

export async function stopImpersonation(targetUserId?: string) {
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-impersonate-stop`;
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify({ target_user_id: targetUserId }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`impersonate-stop failed: ${res.status} ${t}`);
  }
  return res.json();
}

/** Helper: attach impersonation headers when calling other admin functions */
export function withImpersonationHeaders(headers: Record<string, string>, opts?: { impersonateAs?: string; impersonateToken?: string }) {
  if (opts?.impersonateAs && opts?.impersonateToken) {
    headers['x-impersonate-as'] = opts.impersonateAs;
    headers['x-impersonate-token'] = opts.impersonateToken;
  }
  return headers;
}
