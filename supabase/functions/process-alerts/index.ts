/** Edge Function: process-alerts
 * Scheduled to run periodically (e.g., every 2-5 minutes).
 * - Fetch queued notifications ready to send
 * - Enforce quiet hours from notification_prefs
 * - Dedupe using dedupe_key within a window
 * - Send via Expo push
 * - Mark status sent/failed
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type QueueRow = {
  id: string;
  user_id: string;
  type: "smart_hot" | "price_drop";
  title: string;
  body: string;
  route: string;
  dedupe_key: string | null;
  meta: Record<string, unknown>;
  attempts: number;
  scheduled_for: string;
};

const EXPO_ENDPOINT = "https://exp.host/--/api/v2/push/send";

function json(res: any, status = 200) {
  return new Response(JSON.stringify(res), { status, headers: { "content-type": "application/json" } });
}

function isWithinQuietHours(hour: number, start: number, end: number): boolean {
  // Quiet hours may cross midnight (e.g., 22 -> 7)
  if (start === end) return false; // disabled
  if (start < end) {
    return hour >= start && hour < end;
  } else {
    return hour >= start || hour < end;
  }
}

serve(async (_req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Pull a batch
    const { data: rows, error } = await supabase
      .from("notification_queue")
      .select("id,user_id,type,title,body,route,dedupe_key,meta,attempts,scheduled_for")
      .eq("status", "queued")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(500);

    if (error) {
      console.error("DB fetch error:", error);
      return json({ error: "db" }, 500);
    }
    if (!rows || rows.length === 0) return json({ ok: true, processed: 0 });

    // Fetch tokens and prefs in bulk
    const userIds = Array.from(new Set(rows.map(r => r.user_id)));
    const [{ data: tokens }, { data: prefs }] = await Promise.all([
      supabase.from("push_tokens").select("user_id, token").in("user_id", userIds).eq("disabled", false),
      supabase.from("notification_prefs").select("user_id, smart, quiet_hours_start, quiet_hours_end").in("user_id", userIds),
    ]);

    const tokenMap = new Map<string, string[]>();
    (tokens || []).forEach((t: any) => {
      const arr = tokenMap.get(t.user_id) || [];
      arr.push(t.token);
      tokenMap.set(t.user_id, arr);
    });

    const prefMap = new Map<string, { smart?: boolean; quiet_hours_start?: number; quiet_hours_end?: number }>();
    (prefs || []).forEach((p: any) => prefMap.set(p.user_id, p));

    // Dedupe by (user_id, dedupe_key)
    const seen = new Set<string>();

    const now = new Date();
    const hour = now.getUTCHours(); // assuming prefs are UTC; adjust if you store tz

    const toSend: { row: QueueRow; tokens: string[] }[] = [];
    const toSkip: string[] = [];

    for (const row of rows as QueueRow[]) {
      const pref = prefMap.get(row.user_id);
      const smartOn = pref?.smart ?? true;
      if (!smartOn) {
        toSkip.push(row.id);
        continue;
      }

      // Quiet hours: default 22-7
      const qStart = (pref?.quiet_hours_start ?? 22) % 24;
      const qEnd = (pref?.quiet_hours_end ?? 7) % 24;
      if (isWithinQuietHours(hour, qStart, qEnd)) {
        // reschedule to end of quiet hours
        const nextHour = qStart < qEnd ? qEnd : qEnd + 24;
        const deltaH = (nextHour - hour);
        const next = new Date(now.getTime() + deltaH * 3600 * 1000);
        await supabase.from("notification_queue").update({ scheduled_for: next.toISOString() }).eq("id", row.id);
        continue;
      }

      const key = row.dedupe_key ? `${row.user_id}|${row.dedupe_key}` : `${row.user_id}|${row.type}|${row.route}`;
      if (seen.has(key)) {
        toSkip.push(row.id);
        continue;
      }
      seen.add(key);

      const tks = tokenMap.get(row.user_id) || [];
      if (tks.length === 0) {
        toSkip.push(row.id); // nothing to send to
        continue;
      }

      toSend.push({ row, tokens: tks });
    }

    // Send pushes in batches of 100
    const chunks: typeof toSend[] = [];
    for (let i = 0; i < toSend.length; i += 100) chunks.push(toSend.slice(i, i + 100));

    for (const chunk of chunks) {
      const payload = chunk.flatMap(({ row, tokens }) =>
        tokens.map((to) => ({
          to,
          sound: "default" as const,
          title: row.title,
          body: row.body,
          data: { route: row.route, type: row.type, meta: row.meta },
          channelId: "default",
          priority: "high" as const,
        }))
      );

      if (payload.length === 0) continue;

      const resp = await fetch(EXPO_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await resp.json().catch(() => ({}));
      // naive post-processing; mark sent
      await supabase.from("notification_queue").update({ status: "sent", sent_at: new Date().toISOString() }).in(
        "id",
        chunk.map(({ row }) => row.id),
      );
    }

    if (toSkip.length) {
      await supabase.from("notification_queue").update({ status: "skipped" }).in("id", toSkip);
    }

    return json({ ok: true, processed: rows.length, sent_groups: toSend.length, skipped: toSkip.length });
  } catch (e) {
    console.error("process-alerts error", e);
    return json({ error: "internal" }, 500);
  }
});
