import { apiClient } from '@/utils/apiClient';
import { getApiUrl } from '@/utils/config';
import { safeAsync } from '@/utils/errorHandler';

export async function listFlags() {
  const data = await apiClient.get('/admin/flags') as { items: Array<{ key: string; enabled: boolean; value: any; rollout: any; updated_by: string; updated_at: string }> };
  return data;
}

export async function upsertFlag(key: string, data: { enabled?: boolean; value?: any; rollout?: any }, elevationToken: string) {
  return safeAsync(async () => {
    const response = await fetch(getApiUrl('/admin/flags'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-elevation': elevationToken
      },
      body: JSON.stringify({ key, ...data }),
      credentials: 'include'
    });
    if (!response.ok) throw new Error('upsertFlag failed');
    return await response.json();
  }, 'upsertFlag');
}

export async function deleteFlag(key: string, elevationToken: string) {
  return safeAsync(async () => {
    const response = await fetch(getApiUrl(`/admin/flags?key=${key}`), {
      method: 'DELETE',
      headers: { 'x-admin-elevation': elevationToken },
      credentials: 'include'
    });
    if (!response.ok) throw new Error('deleteFlag failed');
    return await response.json();
  }, 'deleteFlag');
}

export async function evalFlags(userId: string) {
  const data = await apiClient.get(`/admin/flags/eval?user_id=${userId}`) as { flags: Record<string, any> };
  return data;
}

export async function listConfig() {
  const data = await apiClient.get('/admin/config');
  return data;
}

export async function upsertConfig(key: string, value: any, type: 'json'|'string'|'number'|'bool', elevationToken: string) {
  return safeAsync(async () => {
    const response = await fetch(getApiUrl('/admin/config'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-elevation': elevationToken
      },
      body: JSON.stringify({ key, value, type }),
      credentials: 'include'
    });
    if (!response.ok) throw new Error('upsertConfig failed');
    return await response.json();
  }, 'upsertConfig');
}

export async function deleteConfig(key: string, elevationToken: string) {
  return safeAsync(async () => {
    const response = await fetch(getApiUrl(`/admin/config?key=${key}`), {
      method: 'DELETE',
      headers: { 'x-admin-elevation': elevationToken },
      credentials: 'include'
    });
    if (!response.ok) throw new Error('deleteConfig failed');
    return await response.json();
  }, 'deleteConfig');
}
