import { apiClient } from '@/utils/apiClient';
import { getApiUrl } from '@/utils/config';
import { safeAsync } from '@/utils/errorHandler';

export async function startImpersonation(targetUserId: string, elevationToken: string) {
  return safeAsync(async () => {
    const response = await fetch(getApiUrl('/admin/impersonate/start'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-elevation': elevationToken,
      },
      body: JSON.stringify({ target_user_id: targetUserId }),
      credentials: 'include'
    });
    if (!response.ok) {
      const t = await response.text().catch(() => '');
      throw new Error(`impersonate-start failed: ${response.status} ${t}`);
    }
    return await response.json() as { token: string; valid_until: string };
  }, 'startImpersonation');
}

export async function stopImpersonation(targetUserId?: string) {
  return safeAsync(async () => {
    const response = await fetch(getApiUrl('/admin/impersonate/stop'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_user_id: targetUserId }),
      credentials: 'include'
    });
    if (!response.ok) {
      const t = await response.text().catch(() => '');
      throw new Error(`impersonate-stop failed: ${response.status} ${t}`);
    }
    return await response.json();
  }, 'stopImpersonation');
}

/** Helper: attach impersonation headers when calling other admin functions */
export function withImpersonationHeaders(headers: Record<string, string>, opts?: { impersonateAs?: string; impersonateToken?: string }) {
  if (opts?.impersonateAs && opts?.impersonateToken) {
    headers['x-impersonate-as'] = opts.impersonateAs;
    headers['x-impersonate-token'] = opts.impersonateToken;
  }
  return headers;
}
