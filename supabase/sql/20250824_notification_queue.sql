-- notification_queue: queue for smart alerts
create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('smart_hot','price_drop')),
  title text not null,
  body text not null,
  route text not null, -- deep link like /deal-details?id=...&comment=...
  dedupe_key text,     -- optional key to coalesce duplicates per user
  meta jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','sent','skipped','failed')),
  attempts int not null default 0,
  scheduled_for timestamptz not null default now(),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists notification_queue_status_idx on public.notification_queue(status, scheduled_for);
create index if not exists notification_queue_user_idx on public.notification_queue(user_id);
create index if not exists notification_queue_dedupe_idx on public.notification_queue(user_id, dedupe_key);

-- RLS
alter table public.notification_queue enable row level security;

do $$ begin
  create policy if not exists "notification_queue_owner_select"
  on public.notification_queue
  for select
  using (auth.uid() = user_id);
exception when others then null; end $$;

-- service role will insert/process; owner can insert too
do $$ begin
  create policy if not exists "notification_queue_owner_insert"
  on public.notification_queue
  for insert
  with check (auth.uid() = user_id);
exception when others then null; end $$;
