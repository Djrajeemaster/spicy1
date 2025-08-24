import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { svcClient } from '../_shared/admin-guard.ts';

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

function hashPercent(key: string, userId: string): number {
  // simple deterministic hash -> 0..99
  let s = 0;
  const str = `${key}:${userId}`;
  for (let i = 0; i < str.length; i++) s = (s * 31 + str.charCodeAt(i)) >>> 0;
  return s % 100;
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id') || '';
    const supa = svcClient();

    const { data, error } = await supa.from('feature_flags').select('key, enabled, value, rollout');
    if (error) return json({ error: 'db_error', details: error.message }, 500);

    const res: Record<string, any> = {};
    for (const f of data || []) {
      let on = !!f.enabled;
      let rollout = f.rollout || {};
      if (!on && rollout?.percent && userId) {
        const pct = Number(rollout.percent) || 0;
        const bucket = hashPercent(f.key, userId);
        if (bucket < pct) on = true;
      }
      if (on) res[f.key] = f.value ?? true;
    }
    return json({ flags: res });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('flags-eval error', e);
    return json({ error: 'internal' }, 500);
  }
});
