import { supabase } from '@/lib/supabase';
export async function p1StartImpersonation(targetUserId:string, elevationToken:string){
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-impersonate-start-p1`;
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  const res = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(jwt?{Authorization:`Bearer ${jwt}`}:{}) ,'x-admin-elevation':elevationToken},body:JSON.stringify({target_user_id:targetUserId})});
  if(!res.ok){throw new Error(`impersonate-start-p1 failed: ${res.status}`);}return res.json();
}
export async function p1StopImpersonation(targetUserId?:string){
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-impersonate-stop-p1`;
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  const res = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(jwt?{Authorization:`Bearer ${jwt}`}:{})},body:JSON.stringify({target_user_id:targetUserId})});
  if(!res.ok){throw new Error(`impersonate-stop-p1 failed: ${res.status}`);}return res.json();
}
export function p1WithImpersonationHeaders(headers:Record<string,string>,opts?:{impersonateAs?:string;impersonateToken?:string}){if(opts?.impersonateAs&&opts?.impersonateToken){headers['x-impersonate-as']=opts.impersonateAs;headers['x-impersonate-token']=opts.impersonateToken;}return headers;}
