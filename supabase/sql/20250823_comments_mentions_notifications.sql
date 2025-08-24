
-- Notifications and preferences (idempotent)

-- notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('mention','reply','smart','marketing','custom')),
  deal_id uuid,
  comment_id uuid,
  payload jsonb default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, read_at);

-- optional preferences
create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mentions boolean default true,
  replies boolean default true,
  smart boolean default true,
  marketing boolean default false,
  quiet_hours_start int default 22,
  quiet_hours_end int default 7
);

-- RLS (enable and basic policies)
alter table public.push_tokens enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_prefs enable row level security;

do $$ begin
  create policy if not exists "push_tokens_owner_upsert"
  on public.push_tokens
  for insert
  with check (auth.uid() = user_id);
exception when others then null; end $$;

do $$ begin
  create policy if not exists "push_tokens_owner_select"
  on public.push_tokens
  for select
  using (auth.uid() = user_id);
exception when others then null; end $$;

do $$ begin
  create policy if not exists "notifications_owner_select"
  on public.notifications
  for select
  using (auth.uid() = user_id);
exception when others then null; end $$;

do $$ begin
  create policy if not exists "notification_prefs_owner_all"
  on public.notification_prefs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
exception when others then null; end $$;
