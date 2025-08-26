import { supabase } from '@/lib/supabase';

const flagsBase  = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-flags`;
const configBase = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-config`;

export async function listFlags() {
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  const res = await fetch(flagsBase, { headers: { ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) } });
  if (!res.ok) throw new Error('listFlags failed');
  return res.json();
}

export async function upsertFlag(key: string, data: { enabled?: boolean; value?: any; rollout?: any }, opts?: { elevationToken?: string }) {
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  const headers: Record<string,string> = {
    'Content-Type':'application/json',
    ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
  };
  if (opts?.elevationToken) headers['x-admin-elevation'] = opts.elevationToken;

  const res = await fetch(flagsBase, { method: 'POST', headers, body: JSON.stringify({ key, ...data }) });
  if (!res.ok) throw new Error('upsertFlag failed');
  return res.json();
}

export async function deleteFlag(key: string, opts?: { elevationToken?: string }) {
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  const url = new URL(flagsBase);
  url.searchParams.set('key', key);
  const headers: Record<string,string> = { ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) };
  if (opts?.elevationToken) headers['x-admin-elevation'] = opts.elevationToken;

  const res = await fetch(url.toString(), { method: 'DELETE', headers });
  if (!res.ok) throw new Error('deleteFlag failed');
  return res.json();
}

/** App config (system settings) */
export async function listConfig() {
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  const res = await fetch(configBase, { headers: { ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) } });
  if (!res.ok) throw new Error('listConfig failed');
  return res.json();
}

export async function upsertConfig(key: string, value: any, type: 'json'|'string'|'number'|'bool', opts?: { elevationToken?: string }) {
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  const headers: Record<string,string> = {
    'Content-Type':'application/json',
    ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
  };
  if (opts?.elevationToken) headers['x-admin-elevation'] = opts.elevationToken;

  const res = await fetch(configBase, { method: 'POST', headers, body: JSON.stringify({ key, value, type }) });
  if (!res.ok) throw new Error('upsertConfig failed');
  return res.json();
}
