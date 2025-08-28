import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { requireAdmin } from '../_shared/admin-guard/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-elevation',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(o: any, s = 200) {
  return new Response(JSON.stringify(o), {
    status: s,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);
    
    const ctx = await requireAdmin(req);
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    const role = url.searchParams.get('role') || '';
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') || '50')));
    const cursor = url.searchParams.get('cursor');

    let query = ctx.supabase
      .from('users')
      .select('id, username, email, role, created_at, status')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Try to also get ban/suspend info if columns exist
    try {
      query = ctx.supabase
        .from('users')
        .select('id, username, email, role, created_at, status, is_banned, ban_expiry, suspend_expiry')
        .order('created_at', { ascending: false })
        .limit(limit);
    } catch (e) {
      // Fallback to basic columns if extended columns don't exist
      console.log('Using basic user columns, extended columns not available');
    }

    if (q) {
      query = query.or(`username.ilike.%${q}%,email.ilike.%${q}%`);
    }
    if (role) {
      query = query.eq('role', role);
    }
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;
    if (error) return json({ error: 'db_error', details: error.message }, 500);

    const nextCursor = data && data.length ? data[data.length - 1].created_at : null;
    return json({ items: data || [], next_cursor: nextCursor });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('admin-users error', e);
    return json({ error: 'internal', details: e.message }, 500);
  }
});
