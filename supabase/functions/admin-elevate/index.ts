import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { requireAdmin, audit } from '../_shared/admin-guard.ts';

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

function randToken(n = 32) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < n; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    const ctx = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const ttl = Math.max(1, Math.min(30, Number(body?.ttl_minutes) || 10));
    const validUntil = new Date(Date.now() + ttl * 60_000).toISOString();
    const token = randToken(40);

    const { error } = await ctx.supabase.from('admin_elevation_sessions').insert({
      user_id: ctx.userId,
      token,
      valid_until: validUntil,
    });
    if (error) return json({ error: 'db_error' }, 500);

    await audit(ctx, {
      action: 'admin.elevate',
      target_type: 'system',
      diff_json: { ttl_minutes: ttl },
    });

    return json({ token, valid_until: validUntil });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('admin-elevate error', e);
    return json({ error: 'internal' }, 500);
  }
});
