

export async function elevate(ttlMinutes: number = 10): Promise<string> {
  const response = await fetch('http://localhost:3000/api/admin/elevate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl_minutes: ttlMinutes }),
    credentials: 'include'
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    
    if (response.status === 401) {
      throw new Error('Unauthorized: Your session has expired. Please sign in again.');
    } else if (response.status === 403) {
      throw new Error('Forbidden: You do not have admin privileges. Please contact an administrator.');
    }
    
    throw new Error(`Admin elevation failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
  }

  const data = await response.json();
  return data.token;
}
