import { supabase } from '@/lib/supabase';

const flagsBase = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-flags`;
const evalBase = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/flags-eval`;
const configBase = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-config`;

export async function listFlags() {
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  const res = await fetch(flagsBase, { headers: { ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) } });
  if (!res.ok) throw new Error('listFlags failed');
  return res.json() as Promise<{ items: Array<{ key: string; enabled: boolean; value: any; rollout: any; updated_by: string; updated_at: string }> }>;
}

export async function upsertFlag(key: string, data: { enabled?: boolean; value?: any; rollout?: any }, elevationToken: string) {
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  const res = await fetch(flagsBase, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      'x-admin-elevation': elevationToken
    },
    body: JSON.stringify({ key, ...data })
  });
  if (!res.ok) throw new Error('upsertFlag failed');
  return res.json();
}

export async function deleteFlag(key: string, elevationToken: string) {
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  const url = new URL(flagsBase); url.searchParams.set('key', key);
  const res = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      'x-admin-elevation': elevationToken
    }
  });
  if (!res.ok) throw new Error('deleteFlag failed');
  return res.json();
}

export async function evalFlags(userId: string) {
  const url = new URL(evalBase); url.searchParams.set('user_id', userId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('evalFlags failed');
  return res.json() as Promise<{ flags: Record<string, any> }>;
}

export async function listConfig() {
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  const res = await fetch(configBase, { headers: { ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) } });
  if (!res.ok) throw new Error('listConfig failed');
  return res.json();
}

export async function upsertConfig(key: string, value: any, type: 'json'|'string'|'number'|'bool', elevationToken: string) {
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  const res = await fetch(configBase, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      'x-admin-elevation': elevationToken
    },
    body: JSON.stringify({ key, value, type })
  });
  if (!res.ok) throw new Error('upsertConfig failed');
  return res.json();
}

export async function deleteConfig(key: string, elevationToken: string) {
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  const url = new URL(configBase); url.searchParams.set('key', key);
  const res = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      'x-admin-elevation': elevationToken
    }
  });
  if (!res.ok) throw new Error('deleteConfig failed');
  return res.json();
}
