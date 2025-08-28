import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { requireAdmin, audit } from '../_shared/admin-guard.ts';

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), { 
    status, 
    headers: { 
      'content-type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-elevation'
    } 
  });
}

function randToken(n = 32) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < n; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-elevation'
      }
    });
  }

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
    
    // If table doesn't exist, try to create it first
    if (error && error.code === '42P01') {
      console.log('Creating admin_elevation_sessions table...');
      const { error: createError } = await ctx.supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS admin_elevation_sessions (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
            token text NOT NULL UNIQUE,
            valid_until timestamp with time zone NOT NULL,
            created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_admin_elevation_sessions_token ON admin_elevation_sessions(token);
          ALTER TABLE admin_elevation_sessions ENABLE ROW LEVEL SECURITY;
          CREATE POLICY IF NOT EXISTS "Users can manage their own elevation sessions" ON admin_elevation_sessions
            FOR ALL USING (user_id = auth.uid());
        `
      });
      
      if (!createError) {
        // Try insert again after creating table
        const { error: retryError } = await ctx.supabase.from('admin_elevation_sessions').insert({
          user_id: ctx.userId,
          token,
          valid_until: validUntil,
        });
        if (retryError) return json({ error: 'db_retry_error', details: retryError.message }, 500);
      } else {
        return json({ error: 'table_creation_failed', details: createError.message }, 500);
      }
    } else if (error) {
      return json({ error: 'db_error', details: error.message }, 500);
    }

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
