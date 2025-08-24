import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export type AdminContext = {
  supabase: SupabaseClient;
  userId: string;
  role: string;
  ip?: string | null;
  ua?: string | null;
  impersonatedUserId?: string | null;
};

function j(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization, x-admin-elevation, x-impersonate-as, x-impersonate-token, content-type",
      "access-control-allow-methods": "GET,POST,OPTIONS",
    },
  });
}

export async function sha256(s: string) {
  const buf = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

/** SRK client */
export function svcClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw j(500, { error: 'missing_env' });
  return createClient(url, key);
}

/** User-scoped client carrying bearer */
export function userClient(req: Request): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !key) throw j(500, { error: 'missing_env' });
  return createClient(url, key, {
    global: { headers: { Authorization: req.headers.get('authorization') ?? req.headers.get('Authorization') ?? '' } },
  });
}

async function fetchUserRole(svc: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await svc
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('fetchUserRole error', error);
    return null;
  }
  return (data?.role ?? null) as string | null;
}

export async function requireAdmin(req: Request): Promise<AdminContext> {
  const supa = userClient(req);
  const { data: auth, error } = await supa.auth.getUser();
  if (error || !auth?.user?.id) throw j(401, { error: 'unauthorized' });

  const svc = svcClient();
  const role = await fetchUserRole(svc, auth.user.id);
  if (!role || !['admin','super_admin','superadmin','super-admin'].includes(String(role).toLowerCase())) {
    throw j(403, { error: 'forbidden' });
  }

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null;
  const ua = req.headers.get('user-agent') || null;

  return { supabase: svc, userId: auth.user.id, role, ip, ua, impersonatedUserId: null };
}

export async function requireElevation(ctx: AdminContext, req: Request): Promise<void> {
  const token = req.headers.get('x-admin-elevation') || '';
  if (!token) throw j(428, { error: 'elevation_required' });

  const tokenHash = await sha256(token);
  const { data: row, error } = await ctx.supabase
    .from('valid_admin_elevation_sessions')  // see SQL view below
    .select('id')
    .eq('user_id', ctx.userId)
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error) {
    console.error('elevation query error', error);
    throw j(500, { error: 'elevation_check_failed' });
  }
  if (!row) throw j(440, { error: 'elevation_expired' });
}

export async function withImpersonation(ctx: AdminContext, req: Request): Promise<AdminContext> {
  const target = req.headers.get('x-impersonate-as');
  const token  = req.headers.get('x-impersonate-token');
  if (!target || !token) return ctx;

  const tokenHash = await sha256(token);
  const { data: row, error } = await ctx.supabase
    .from('valid_impersonation_sessions')     // view below
    .select('id')
    .eq('admin_id', ctx.userId)
    .eq('target_user_id', target)
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error) {
    console.error('impersonation query error', error);
    throw j(500, { error: 'impersonation_check_failed' });
  }
  if (!row) throw j(403, { error: 'impersonation_invalid' });

  ctx.impersonatedUserId = target;
  return ctx;
}

export async function audit(ctx: AdminContext, log: {
  action: string;
  target_type: string;
  target_id?: string | null;
  diff_json?: Record<string, unknown> | null;
}) {
  const { error } = await ctx.supabase.from('audit_log').insert({
    actor_id: ctx.userId,
    actor_role: ctx.role,
    action: log.action,
    target_type: log.target_type,
    target_id: log.target_id ?? null,
    diff_json: log.diff_json ?? {},
    ip: ctx.ip ?? null,
    ua: ctx.ua ?? null,
    impersonated_user_id: ctx.impersonatedUserId ?? null,
  });
  if (error) console.error('audit insert error', error);
}
