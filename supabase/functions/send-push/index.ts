import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { requireAdmin, requireElevation, audit } from '../_shared/admin-guard.ts';

const EXPO_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

function json(res: any, status = 200) {
  return new Response(JSON.stringify(res), { status, headers: { 'content-type': 'application/json' } });
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    const ctx = await requireAdmin(req);
    await requireElevation(ctx, req); // step-up required

    const payload = await req.json().catch(() => ({}));
    const { user_id, tokens, title, body, data } = payload || {};

    if ((!user_id && (!tokens || !Array.isArray(tokens))) || !title || !body) {
      return json({ error: 'Missing required fields' }, 400);
    }

    let targetTokens: string[] = tokens ?? [];

    if (user_id) {
      const { data: rows, error } = await ctx.supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', user_id)
        .eq('disabled', false);
      if (error) {
        console.error('DB error:', error);
        return json({ error: 'DB error' }, 500);
      }
      targetTokens = targetTokens.concat((rows ?? []).map((r: any) => r.token));
    }

    targetTokens = Array.from(new Set(targetTokens)).filter(Boolean);
    if (targetTokens.length === 0) return json({ ok: true, sent: 0 });

    const messages = targetTokens.map((to) => ({
      to,
      sound: 'default' as const,
      title,
      body,
      data: data || {},
      channelId: 'default',
      priority: 'high' as const,
    }));

    const resp = await fetch(EXPO_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
    const result = await resp.json().catch(() => ({}));

    await audit(ctx, {
      action: 'push.send',
      target_type: 'push',
      diff_json: { user_id, tokens_count: targetTokens.length, title, data },
    });

    try {
      const tickets = Array.isArray(result?.data) ? result.data : [];
      const toDisable: string[] = [];
      for (const t of tickets) {
        if (t?.status === 'error' && (t?.details?.error === 'DeviceNotRegistered' || t?.details?.error === 'InvalidCredentials')) {
          if (t?.to) toDisable.push(t.to);
        }
      }
      if (toDisable.length) {
        await ctx.supabase.from('push_tokens').update({ disabled: true }).in('token', toDisable);
      }
    } catch {}

    return json({ ok: true, sent: messages.length, result });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('send-push error', e);
    return json({ error: 'internal' }, 500);
  }
});
