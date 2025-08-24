-- Audit log (append-only)
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  actor_role text not null,
  action text not null,             -- e.g., 'user.ban', 'deal.approve', 'settings.update'
  target_type text not null,        -- e.g., 'user','deal','settings','category','banner','system'
  target_id text,                   -- id string for the target (nullable for system actions)
  diff_json jsonb default '{}'::jsonb,  -- structured change payload
  ip text,
  ua text,
  impersonated_user_id uuid,        -- if acting-as someone else
  created_at timestamptz not null default now()
);

create index if not exists audit_log_actor_idx on public.audit_log(actor_id, created_at desc);
create index if not exists audit_log_action_idx on public.audit_log(action, created_at desc);
create index if not exists audit_log_target_idx on public.audit_log(target_type, target_id);
create index if not exists audit_log_created_idx on public.audit_log(created_at desc);

-- RLS: restrict direct table access. Admin UI must use an Edge Function with service role.
alter table public.audit_log enable row level security;

-- no direct select/insert policies; only service role via Edge Functions should access this table.
-- (If you want direct select for admins, add a policy using auth.jwt() role claim.)
