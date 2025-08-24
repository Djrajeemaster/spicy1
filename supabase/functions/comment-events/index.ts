
/** Edge Function: comment-events
 * Accepts POST with: { deal_id, comment_id, author_id, content, parent_user_id? }
 * Finds @mentions and parent user, sends push via Expo.
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const EXPO_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

function json(res: any, status = 200) {
  return new Response(JSON.stringify(res), { status, headers: { 'content-type': 'application/json' } });
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { deal_id, comment_id, author_id, content, parent_user_id } = await req.json();

    if (!deal_id || !comment_id || !author_id || typeof content !== 'string') {
      return json({ error: 'Missing fields' }, 400);
    }

    // Parse @mentions
    const mentions = new Set<string>();
    const re = /@([A-Za-z0-9_]+)/g;
    let m;
    while ((m = re.exec(content))) {
      mentions.add(m[1]);
    }

    const recipients = new Set<string>();

    // Fetch users for mentioned usernames
    if (mentions.size) {
      const usernames = Array.from(mentions);
      const { data: users, error } = await supabase
        .from('users')
        .select('id, username')
        .in('username', usernames);
      if (!error && users) {
        users.forEach((u: any) => recipients.add(u.id));
      }
    }

    if (parent_user_id) recipients.add(parent_user_id);
    recipients.delete(author_id); // do not notify self

    if (recipients.size === 0) return json({ ok: true, sent: 0 });

    // Get tokens for recipients
    const { data: tokensRows, error: tokErr } = await supabase
      .from('push_tokens')
      .select('token, user_id')
      .in('user_id', Array.from(recipients))
      .eq('disabled', false);
    if (tokErr) {
      console.error('Token fetch error:', tokErr);
      return json({ error: 'DB error' }, 500);
    }
    const messages = (tokensRows ?? []).map((r: any) => ({
      to: r.token,
      sound: 'default' as const,
      title: 'New mention/reply',
      body: content.slice(0, 100),
      data: { route: `/deal-details?id=${deal_id}&comment=${comment_id}` },
      channelId: 'default',
      priority: 'high' as const,
    }));

    if (messages.length === 0) return json({ ok: true, sent: 0 });

    const resp = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
    const result = await resp.json().catch(() => ({}));

    return json({ ok: true, sent: messages.length, result });
  } catch (e) {
    console.error('comment-events error', e);
    return json({ error: 'internal' }, 500);
  }
});
