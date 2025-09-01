

export async function startImpersonation(targetUserId: string, elevationToken: string) {
  const res = await fetch('http://localhost:3000/api/admin/impersonate/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-elevation': elevationToken,
    },
    body: JSON.stringify({ target_user_id: targetUserId }),
    credentials: 'include'
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`impersonate-start failed: ${res.status} ${t}`);
  }
  return res.json() as Promise<{ token: string; valid_until: string }>;
}

export async function stopImpersonation(targetUserId?: string) {
  const res = await fetch('http://localhost:3000/api/admin/impersonate/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_user_id: targetUserId }),
    credentials: 'include'
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
