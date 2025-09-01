

export async function listFlags() {
  const res = await fetch('http://localhost:3000/api/admin/flags', { credentials: 'include' });
  if (!res.ok) throw new Error('listFlags failed');
  return res.json();
}

export async function upsertFlag(key: string, data: { enabled?: boolean; value?: any; rollout?: any }, opts?: { elevationToken?: string }) {
  const headers: Record<string,string> = { 'Content-Type':'application/json' };
  if (opts?.elevationToken) headers['x-admin-elevation'] = opts.elevationToken;

  const res = await fetch('http://localhost:3000/api/admin/flags', { 
    method: 'POST', 
    headers, 
    body: JSON.stringify({ key, ...data }),
    credentials: 'include'
  });
  if (!res.ok) throw new Error('upsertFlag failed');
  return res.json();
}

export async function deleteFlag(key: string, opts?: { elevationToken?: string }) {
  const headers: Record<string,string> = {};
  if (opts?.elevationToken) headers['x-admin-elevation'] = opts.elevationToken;

  const res = await fetch(`http://localhost:3000/api/admin/flags?key=${key}`, { 
    method: 'DELETE', 
    headers,
    credentials: 'include'
  });
  if (!res.ok) throw new Error('deleteFlag failed');
  return res.json();
}

/** App config (system settings) */
export async function listConfig() {
  const res = await fetch('http://localhost:3000/api/admin/config', { credentials: 'include' });
  if (!res.ok) throw new Error('listConfig failed');
  return res.json();
}

export async function upsertConfig(key: string, value: any, type: 'json'|'string'|'number'|'bool', opts?: { elevationToken?: string }) {
  const headers: Record<string,string> = { 'Content-Type':'application/json' };
  if (opts?.elevationToken) headers['x-admin-elevation'] = opts.elevationToken;

  const res = await fetch('http://localhost:3000/api/admin/config', { 
    method: 'POST', 
    headers, 
    body: JSON.stringify({ key, value, type }),
    credentials: 'include'
  });
  if (!res.ok) throw new Error('upsertConfig failed');
  return res.json();
}
