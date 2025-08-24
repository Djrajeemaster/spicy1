create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  value jsonb not null default '{}'::jsonb,
  rollout jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.feature_flags enable row level security;

create table if not exists public.app_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  type text not null default 'json',
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;
