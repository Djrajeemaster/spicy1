import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { requireAdmin, requireElevation, audit, svcClient, withImpersonation } from '../_shared/admin-guard.ts';
import { sanitizeEntity, filterData, TextSearchColumns } from '../_shared/admin-metadata.ts';

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

async function hasDeletedAt(supa: any, entity: string): Promise<boolean> {
  const { data, error } = await supa
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', entity)
    .eq('column_name', 'deleted_at');
  return !!(data && data.length);
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const op = (url.searchParams.get('op') || '').toLowerCase(); // list|get|create|update|delete
    const ent = sanitizeEntity(url.searchParams.get('entity') || '');
    let ctx = await requireAdmin(req);
    ctx = await withImpersonation(ctx, req);
    const supa = svcClient();

    const writeOps = ['create','update','delete'];
    if (writeOps.includes(op)) {
      await requireElevation(ctx, req);
    }

    if (op === 'list') {
      const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') || '50')));
      const cursor = url.searchParams.get('cursor');
      const q = (url.searchParams.get('q') || '').trim();

      let query = supa.from(ent).select('*').order('created_at', { ascending: false }).limit(limit);
      if (cursor) query = query.lt('created_at', cursor);
      if (q && TextSearchColumns[ent]?.length) {
        const ors = TextSearchColumns[ent]!.map(c => `${c}.ilike.%${q}%`).join(',');
        query = query.or(ors);
      }
      const { data, error } = await query;
      if (error) return json({ error: 'db_error', details: error.message }, 500);
      const nextCursor = data && data.length ? data[data.length - 1].created_at : null;
      return json({ items: data || [], next_cursor: nextCursor });
    }

    if (op === 'get') {
      const id = url.searchParams.get('id');
      if (!id) return json({ error: 'missing_id' }, 400);
      const { data, error } = await supa.from(ent).select('*').eq('id', id).maybeSingle();
      if (error) return json({ error: 'db_error', details: error.message }, 500);
      return json({ item: data });
    }

    if (op === 'create') {
      const { data: body } = await req.json().then((d) => ({ data: d })).catch(() => ({ data: {} }));
      const clean = filterData(ent, body);
      const { data, error } = await supa.from(ent).insert(clean).select('id').maybeSingle();
      if (error) return json({ error: 'db_error', details: error.message }, 500);
      await audit(ctx, { action: 'admin.crud.create', target_type: ent, target_id: data?.id || null, diff_json: clean });
      return json({ ok: true, id: data?.id });
    }

    if (op === 'update') {
      const id = url.searchParams.get('id');
      if (!id) return json({ error: 'missing_id' }, 400);
      const { data: body } = await req.json().then((d) => ({ data: d })).catch(() => ({ data: {} }));
      const clean = filterData(ent, body);
      const { error } = await supa.from(ent).update(clean).eq('id', id);
      if (error) return json({ error: 'db_error', details: error.message }, 500);
      await audit(ctx, { action: 'admin.crud.update', target_type: ent, target_id: id, diff_json: clean });
      return json({ ok: true });
    }

    if (op === 'delete') {
      const id = url.searchParams.get('id');
      const soft = (url.searchParams.get('soft') || 'true') !== 'false';
      if (!id) return json({ error: 'missing_id' }, 400);

      if (soft && await hasDeletedAt(supa, ent)) {
        const { error } = await supa.from(ent).update({ deleted_at: new Date().toISOString() }).eq('id', id);
        if (error) return json({ error: 'db_error', details: error.message }, 500);
      } else {
        const { error } = await supa.from(ent).delete().eq('id', id);
        if (error) return json({ error: 'db_error', details: error.message }, 500);
      }
      await audit(ctx, { action: 'admin.crud.delete', target_type: ent, target_id: id });
      return json({ ok: true });
    }

    return json({ error: 'invalid_op' }, 400);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('admin-crud error', e);
    return json({ error: 'internal' }, 500);
  }
});
