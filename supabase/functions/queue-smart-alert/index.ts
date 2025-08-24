import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireAdmin, audit } from "../_shared/admin-guard.ts";

function json(res: any, status = 200) {
  return new Response(JSON.stringify(res), { status, headers: { "content-type": "application/json" } });
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const ctx = await requireAdmin(req);

    const body = await req.json().catch(() => ({}));
    const { audience, type, deal_id, dedupe_key, title, body: msgBody, route, meta } = body || {};

    if (!deal_id || !type || !audience || (type !== "smart_hot" && type !== "price_drop")) {
      return json({ error: "Missing required fields" }, 400);
    }

    let users: string[] = [];

    if (audience?.user_ids?.length) {
      users = users.concat(audience.user_ids);
    }

    if (audience?.savers_of_deal) {
      const { data: savers } = await ctx.supabase
        .from("deal_saves")
        .select("user_id")
        .eq("deal_id", audience.savers_of_deal);
      if (savers?.length) users = users.concat(savers.map((r: any) => r.user_id));
    }

    if (audience?.followers_of_deal) {
      const { data: fol } = await ctx.supabase
        .from("deal_followers")
        .select("user_id")
        .eq("deal_id", audience.followers_of_deal);
      if (fol?.length) users = users.concat(fol.map((r: any) => r.user_id));
    }

    users = Array.from(new Set(users)).filter(Boolean);
    if (users.length === 0) return json({ ok: true, enqueued: 0 });

    const routeStr = route || `/deal-details?id=${deal_id}`;
    const titleStr = title || (type === "price_drop" ? "Price drop on a saved deal" : "Hot deal alert");
    const bodyStr = msgBody || (type === "price_drop" ? "A deal you saved just dropped in price." : "A deal you’re watching is getting hot.");

    const rows = users.map((uid) => ({
      user_id: uid,
      type,
      title: titleStr,
      body: bodyStr,
      route: routeStr,
      dedupe_key: dedupe_key || `${type}:${deal_id}`,
      meta: meta || { deal_id },
      status: "queued",
    }));

    const { error: insErr, count } = await ctx.supabase
      .from("notification_queue")
      .insert(rows, { count: "exact" });
    if (insErr) return json({ error: "enqueue_failed" }, 500);

    await audit(ctx, {
      action: "alerts.enqueue",
      target_type: "deal",
      target_id: deal_id,
      diff_json: { users_count: users.length, type, dedupe_key: dedupe_key || `${type}:${deal_id}` },
    });

    return json({ ok: true, enqueued: count || rows.length });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("queue-smart-alert error", e);
    return json({ error: "internal" }, 500);
  }
});
