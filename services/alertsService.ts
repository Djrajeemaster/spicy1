import { supabase } from '@/lib/supabase';

type Audience =
  | { user_ids: string[] }
  | { savers_of_deal: string }
  | { followers_of_deal: string };

type SmartType = 'smart_hot' | 'price_drop';

export async function enqueueSmartAlert(params: {
  audience: Audience;
  type: SmartType;
  deal_id: string;
  dedupe_key?: string;
  title?: string;
  body?: string;
  route?: string;
  meta?: any;
}) {
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/queue-smart-alert`;
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`enqueueSmartAlert failed: ${res.status} ${t}`);
  }
  return res.json();
}
