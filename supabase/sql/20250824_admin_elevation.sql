-- Admin elevation sessions: short-lived step-up tokens (e.g., after 2FA verification)
create table if not exists public.admin_elevation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token text not null,                 -- random opaque token returned to client
  valid_until timestamptz not null,    -- expires (e.g., now() + interval '10 minutes')
  created_at timestamptz not null default now()
);

create index if not exists admin_elevation_user_idx on public.admin_elevation_sessions(user_id);
create index if not exists admin_elevation_valid_idx on public.admin_elevation_sessions(valid_until);

alter table public.admin_elevation_sessions enable row level security;

-- No RLS policies; access managed only by service role Edge Functions.
