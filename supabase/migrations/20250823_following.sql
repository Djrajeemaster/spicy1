-- Following system for users and stores
create table if not exists public.user_follows (
  follower_id uuid references public.users(id) on delete cascade,
  followed_id uuid references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, followed_id)
);

create index if not exists idx_user_follows_followed on public.user_follows(followed_id);

create table if not exists public.store_follows (
  follower_id uuid references public.users(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, store_id)
);

create index if not exists idx_store_follows_store on public.store_follows(store_id);

-- Optional: helper function to run raw SQL from PostgREST (restrict usage in prod)
create or replace function public.exec_sql(sql text)
returns setof record
language plpgsql
security definer
as $$
begin
  return query execute sql;
end;
$$;

-- Row Level Security (basic)
alter table public.user_follows enable row level security;
do $$ begin
  create policy user_follows_select on public.user_follows for select using (true);
  create policy user_follows_insert on public.user_follows for insert with check (auth.uid() = follower_id);
  create policy user_follows_delete on public.user_follows for delete using (auth.uid() = follower_id);
exception when duplicate_object then null;
end $$;

alter table public.store_follows enable row level security;
do $$ begin
  create policy store_follows_select on public.store_follows for select using (true);
  create policy store_follows_insert on public.store_follows for insert with check (auth.uid() = follower_id);
  create policy store_follows_delete on public.store_follows for delete using (auth.uid() = follower_id);
exception when duplicate_object then null;
end $$;
