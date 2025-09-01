

export async function setUserRole(userId: string, role: string, opts?: { elevationToken?: string }) {
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-set-role`;
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;

  const headers: Record<string,string> = {
    'Content-Type':'application/json',
    ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
  };
  if (opts?.elevationToken) headers['x-admin-elevation'] = opts.elevationToken;

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ user_id: userId, role }) });
  if (!res.ok) throw new Error(`admin-set-role failed: ${res.status}`);
  return res.json();
}

export async function listUsers(params?: { q?: string; role?: string; limit?: number; cursor?: string }) {
  try {
    // Try the Edge Function first
    const url = new URL(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-users`);
    if (params?.q) url.searchParams.set('q', params.q);
    if (params?.role) url.searchParams.set('role', params.role);
    if (params?.limit) url.searchParams.set('limit', String(params.limit));
    if (params?.cursor) url.searchParams.set('cursor', params.cursor);
    
    const { data: session } = await supabase.auth.getSession();
    const jwt = session.session?.access_token;

    const res = await fetch(url.toString(), { 
      headers: { 
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        'Content-Type': 'application/json'
      } 
    });
    
    if (res.ok) {
      return res.json();
    }
    
    // If Edge Function fails, fall back to direct database query
    console.warn('Edge Function failed, falling back to direct database query');
  } catch (error) {
    console.warn('Edge Function error, falling back to direct database query:', error);
  }

  // Fallback: Direct database query
  console.log('Using direct database query for listUsers');
  
  const limit = params?.limit || 30;
  let query = supabase
    .from('users')
    .select('id, username, email, role, created_at, status')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (params?.q) {
    query = query.or(`username.ilike.%${params.q}%,email.ilike.%${params.q}%`);
  }
  if (params?.role) {
    query = query.eq('role', params.role);
  }
  if (params?.cursor) {
    query = query.lt('created_at', params.cursor);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load users: ${error.message}`);
  }

  const nextCursor = data && data.length ? (data[data.length - 1] as any).created_at : null;
  return { items: data || [], next_cursor: nextCursor };
}
