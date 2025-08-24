create table if not exists public.impersonation_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  target_user_id uuid not null,
  token text not null,
  valid_until timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists impersonation_sessions_admin_idx on public.impersonation_sessions(admin_id, valid_until);
create index if not exists impersonation_sessions_target_idx on public.impersonation_sessions(target_user_id);
alter table public.impersonation_sessions enable row level security;
