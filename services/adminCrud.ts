import { supabase } from '@/lib/supabase';

const base = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-crud`;

export type Entity = 'users' | 'deals' | 'comments' | 'stores' | 'categories' | 'banners';

export async function list(entity: Entity, params?: { q?: string; limit?: number; cursor?: string }) {
  const url = new URL(base);
  url.searchParams.set('op', 'list');
  url.searchParams.set('entity', entity);
  if (params?.q) url.searchParams.set('q', params.q);
  if (params?.limit) url.searchParams.set('limit', String(params.limit));
  if (params?.cursor) url.searchParams.set('cursor', params.cursor);

  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
  });
  if (!res.ok) throw new Error(`admin-crud list failed: ${res.status}`);
  return res.json() as Promise<{ items: any[]; next_cursor: string | null }>;
}

export async function get(entity: Entity, id: string) {
  const url = new URL(base);
  url.searchParams.set('op', 'get');
  url.searchParams.set('entity', entity);
  url.searchParams.set('id', id);
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
  });
  if (!res.ok) throw new Error(`admin-crud get failed: ${res.status}`);
  return res.json() as Promise<{ item: any }>;
}

export async function create(entity: Entity, data: any, elevationToken: string) {
  const url = new URL(base);
  url.searchParams.set('op', 'create');
  url.searchParams.set('entity', entity);
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      'x-admin-elevation': elevationToken
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`admin-crud create failed: ${res.status}`);
  return res.json() as Promise<{ ok: boolean; id: string }>;
}

export async function update(entity: Entity, id: string, data: any, elevationToken: string) {
  const url = new URL(base);
  url.searchParams.set('op', 'update');
  url.searchParams.set('entity', entity);
  url.searchParams.set('id', id);
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  const res = await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      'x-admin-elevation': elevationToken
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`admin-crud update failed: ${res.status}`);
  return res.json() as Promise<{ ok: boolean }>;
}

export async function remove(entity: Entity, id: string, elevationToken: string, soft = true) {
  const url = new URL(base);
  url.searchParams.set('op', 'delete');
  url.searchParams.set('entity', entity);
  url.searchParams.set('id', id);
  url.searchParams.set('soft', String(soft));
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  const res = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      'x-admin-elevation': elevationToken
    }
  });
  if (!res.ok) throw new Error(`admin-crud delete failed: ${res.status}`);
  return res.json() as Promise<{ ok: boolean }>;
}
