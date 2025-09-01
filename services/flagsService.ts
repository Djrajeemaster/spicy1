

export async function listFlags() {
  const res = await fetch('http://localhost:3000/api/admin/flags', { credentials: 'include' });
  if (!res.ok) throw new Error('listFlags failed');
  return res.json() as Promise<{ items: Array<{ key: string; enabled: boolean; value: any; rollout: any; updated_by: string; updated_at: string }> }>;
}

export async function upsertFlag(key: string, data: { enabled?: boolean; value?: any; rollout?: any }, elevationToken: string) {
  const res = await fetch('http://localhost:3000/api/admin/flags', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-elevation': elevationToken
    },
    body: JSON.stringify({ key, ...data }),
    credentials: 'include'
  });
  if (!res.ok) throw new Error('upsertFlag failed');
  return res.json();
}

export async function deleteFlag(key: string, elevationToken: string) {
  const res = await fetch(`http://localhost:3000/api/admin/flags?key=${key}`, {
    method: 'DELETE',
    headers: { 'x-admin-elevation': elevationToken },
    credentials: 'include'
  });
  if (!res.ok) throw new Error('deleteFlag failed');
  return res.json();
}

export async function evalFlags(userId: string) {
  const res = await fetch(`http://localhost:3000/api/admin/flags/eval?user_id=${userId}`);
  if (!res.ok) throw new Error('evalFlags failed');
  return res.json() as Promise<{ flags: Record<string, any> }>;
}

export async function listConfig() {
  const res = await fetch('http://localhost:3000/api/admin/config', { credentials: 'include' });
  if (!res.ok) throw new Error('listConfig failed');
  return res.json();
}

export async function upsertConfig(key: string, value: any, type: 'json'|'string'|'number'|'bool', elevationToken: string) {
  const res = await fetch('http://localhost:3000/api/admin/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-elevation': elevationToken
    },
    body: JSON.stringify({ key, value, type }),
    credentials: 'include'
  });
  if (!res.ok) throw new Error('upsertConfig failed');
  return res.json();
}

export async function deleteConfig(key: string, elevationToken: string) {
  const res = await fetch(`http://localhost:3000/api/admin/config?key=${key}`, {
    method: 'DELETE',
    headers: { 'x-admin-elevation': elevationToken },
    credentials: 'include'
  });
  if (!res.ok) throw new Error('deleteConfig failed');
  return res.json();
}
