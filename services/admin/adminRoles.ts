

export async function setUserRole(userId: string, role: string, opts?: { elevationToken?: string }) {
  const url = `http://localhost:3000/api/users/${userId}/role`;
  
  const headers: Record<string,string> = {
    'Content-Type':'application/json',
  };
  if (opts?.elevationToken) headers['x-admin-elevation'] = opts.elevationToken;

  const res = await fetch(url, { 
    method: 'PUT', 
    headers, 
    body: JSON.stringify({ role }),
    credentials: 'include'
  });
  if (!res.ok) throw new Error(`admin-set-role failed: ${res.status}`);
  return res.json();
}

export async function listUsers(params?: { q?: string; role?: string; limit?: number; cursor?: string }) {
  try {
    // Try the API endpoint first
    const apiUrl = 'http://localhost:3000/api/users';
    const urlParams = new URLSearchParams();
    if (params?.q) urlParams.set('q', params.q);
    if (params?.role) urlParams.set('role', params.role);
    if (params?.limit) urlParams.set('limit', String(params.limit));
    if (params?.cursor) urlParams.set('cursor', params.cursor);
    
    const fullUrl = urlParams.toString() ? `${apiUrl}?${urlParams}` : apiUrl;
    
    const res = await fetch(fullUrl, { 
      headers: { 
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (res.ok) {
      const data = await res.json();
      return { items: data || [], next_cursor: null };
    }
    
    // If Edge Function fails, fall back to direct database query
    console.warn('Edge Function failed, falling back to direct database query');
  } catch (error) {
    console.warn('Edge Function error, falling back to direct database query:', error);
  }

  // Fallback: Direct API query
  console.log('Using direct database query for listUsers');
  
  try {
    const response = await fetch('http://localhost:3000/api/users', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      return { items: data || [], next_cursor: null };
    }
    
    throw new Error(`API request failed: ${response.status}`);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return { items: [], next_cursor: null };
  }
}
