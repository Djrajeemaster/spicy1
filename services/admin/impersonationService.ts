import { apiClient } from '@/utils/apiClient';



export async function startImpersonation(targetUserId: string, opts?: { elevationToken?: string }) {
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-impersonate-start`;
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;

  const headers: Record<string,string> = {
    'Content-Type':'application/json',
    ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
  };
  if (opts?.elevationToken) headers['x-admin-elevation'] = opts.elevationToken;

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ target_user_id: targetUserId }) });
  if (!res.ok) throw new Error(`impersonate-start failed: ${res.status}`);
  return res.json();
}

export async function stopImpersonation(targetUserId?: string) {
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-impersonate-stop`;
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
    body: JSON.stringify({ target_user_id: targetUserId }),
  });
  if (!res.ok) throw new Error(`impersonate-stop failed: ${res.status}`);
  return res.json();
}
