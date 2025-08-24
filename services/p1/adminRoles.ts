import { supabase } from '@/lib/supabase';
export async function p1SetUserRole(userId:string, role:string, elevationToken:string, opts?:{impersonateAs?:string;impersonateToken?:string}){
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-set-role-p1`;
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  const headers:Record<string,string>={'Content-Type':'application/json',...(jwt?{Authorization:`Bearer ${jwt}`}:{}) ,'x-admin-elevation':elevationToken};
  if(opts?.impersonateAs && opts?.impersonateToken){headers['x-impersonate-as']=opts.impersonateAs;headers['x-impersonate-token']=opts.impersonateToken;}
  const res = await fetch(url,{method:'POST',headers,body:JSON.stringify({user_id:userId,role})});
  if(!res.ok){throw new Error(`admin-set-role-p1 failed: ${res.status}`);}return res.json();
}
export async function p1ListUsers(params?:{q?:string;role?:string;limit?:number;cursor?:string}){
  const url=new URL(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-users-p1`);
  if(params?.q) url.searchParams.set('q', params.q);
  if(params?.role) url.searchParams.set('role', params.role);
  if(params?.limit) url.searchParams.set('limit', String(params.limit));
  if(params?.cursor) url.searchParams.set('cursor', params.cursor);
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  const res = await fetch(url.toString(),{headers:{...(jwt?{Authorization:`Bearer ${jwt}`}:{})}});
  if(!res.ok){throw new Error(`admin-users-p1 failed: ${res.status}`);}return res.json();
}
