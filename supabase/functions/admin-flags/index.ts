import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { requireAdmin, svcClient } from '../_shared/admin-guard/index.ts';
function json(o:any,s=200){return new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});}
serve(async (req)=>{try{const url=new URL(req.url);const supa=svcClient();const method=req.method.toUpperCase();
  if(method==='GET'){await requireAdmin(req);const key=url.searchParams.get('key');if(key){const {data,error}=await supa.from('feature_flags').select('*').eq('key',key).maybeSingle();if(error) return json({error:'db_error',details:error.message},500);return json({item:data});} else {const {data,error}=await supa.from('feature_flags').select('*').order('key');if(error) return json({error:'db_error',details:error.message},500);return json({items:data||[]});}}
  if(method==='POST'||method==='PUT'||method==='PATCH'){await requireAdmin(req);const {key,enabled,value,rollout}=await req.json();if(!key) return json({error:'missing_key'},400);const row={key,enabled:Boolean(enabled),value:value??{},rollout:rollout??{},updated_at:new Date().toISOString()};const {error}=await supa.from('feature_flags').upsert(row);if(error) return json({error:'db_error',details:error.message},500);return json({ok:true});}
  if(method==='DELETE'){await requireAdmin(req);const key=url.searchParams.get('key');if(!key) return json({error:'missing_key'},400);const {error}=await supa.from('feature_flags').delete().eq('key',key);if(error) return json({error:'db_error',details:error.message},500);return json({ok:true});}
  return json({error:'method_not_allowed'},405);
} catch(e){if(e instanceof Response) return e;console.error('admin-flags error',e);return json({error:'internal'},500);}});
