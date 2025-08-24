import { supabase } from '@/lib/supabase';
const base = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-crud-p1`;
export type Entity = 'users'|'deals'|'comments'|'stores'|'categories'|'banners';
export async function p1List(entity:Entity, params?:{q?:string;limit?:number;cursor?:string}){
  const url=new URL(base); url.searchParams.set('op','list'); url.searchParams.set('entity',entity);
  if(params?.q) url.searchParams.set('q', params.q);
  if(params?.limit) url.searchParams.set('limit', String(params.limit));
  if(params?.cursor) url.searchParams.set('cursor', params.cursor || '');
  const { data: session } = await supabase.auth.getSession(); const jwt = session.session?.access_token;
  const res = await fetch(url.toString(), { headers: { ...(jwt?{Authorization:`Bearer ${jwt}`}:{}) } });
  if(!res.ok) throw new Error(`admin-crud-p1 list failed: ${res.status}`);
  return res.json();
}
export async function p1Get(entity:Entity, id:string){
  const url=new URL(base); url.searchParams.set('op','get'); url.searchParams.set('entity',entity); url.searchParams.set('id', id);
  const { data: session } = await supabase.auth.getSession(); const jwt = session.session?.access_token;
  const res = await fetch(url.toString(), { headers: { ...(jwt?{Authorization:`Bearer ${jwt}`}:{}) } });
  if(!res.ok) throw new Error(`admin-crud-p1 get failed: ${res.status}`);
  return res.json();
}
export async function p1Create(entity:Entity, data:any, elevationToken:string){
  const url=new URL(base); url.searchParams.set('op','create'); url.searchParams.set('entity',entity);
  const { data: session } = await supabase.auth.getSession(); const jwt = session.session?.access_token;
  const res = await fetch(url.toString(), { method:'POST', headers:{'Content-Type':'application/json', ...(jwt?{Authorization:`Bearer ${jwt}`}:{}) , 'x-admin-elevation':elevationToken}, body: JSON.stringify(data) });
  if(!res.ok) throw new Error(`admin-crud-p1 create failed: ${res.status}`);
  return res.json();
}
export async function p1Update(entity:Entity, id:string, data:any, elevationToken:string){
  const url=new URL(base); url.searchParams.set('op','update'); url.searchParams.set('entity',entity); url.searchParams.set('id', id);
  const { data: session } = await supabase.auth.getSession(); const jwt = session.session?.access_token;
  const res = await fetch(url.toString(), { method:'PATCH', headers:{'Content-Type':'application/json', ...(jwt?{Authorization:`Bearer ${jwt}`}:{}) , 'x-admin-elevation':elevationToken}, body: JSON.stringify(data) });
  if(!res.ok) throw new Error(`admin-crud-p1 update failed: ${res.status}`);
  return res.json();
}
export async function p1Remove(entity:Entity, id:string, elevationToken:string, soft=true){
  const url=new URL(base); url.searchParams.set('op','delete'); url.searchParams.set('entity',entity); url.searchParams.set('id', id); url.searchParams.set('soft', String(soft));
  const { data: session } = await supabase.auth.getSession(); const jwt = session.session?.access_token;
  const res = await fetch(url.toString(), { method:'DELETE', headers:{ ...(jwt?{Authorization:`Bearer ${jwt}`}:{}) , 'x-admin-elevation':elevationToken } });
  if(!res.ok) throw new Error(`admin-crud-p1 delete failed: ${res.status}`);
  return res.json();
}
