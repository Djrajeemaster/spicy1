import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { requireAdmin } from '../_shared/admin-guard.ts';

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

serve(async (req) => {
  try {
    if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);
    const ctx = await requireAdmin(req);

    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') || '50')));
    const cursor = url.searchParams.get('cursor');

    let query = ctx.supabase
      .from('audit_log')
      .select('id, actor_id, actor_role, action, target_type, target_id, diff_json, ip, ua, impersonated_user_id, created_at')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;
    if (error) return json({ error: 'db_error' }, 500);

    const nextCursor = data && data.length ? data[data.length - 1].created_at : null;
    return json({ items: data || [], next_cursor: nextCursor });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('admin-audit error', e);
    return json({ error: 'internal' }, 500);
  }
});
