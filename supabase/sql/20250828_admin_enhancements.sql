-- Admin announcements table for communication system
create table if not exists public.admin_announcements (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  content text not null,
  type text not null check (type in ('info', 'warning', 'urgent')),
  target_audience text not null check (target_audience in ('all', 'verified', 'business', 'moderators')),
  send_push boolean not null default false,
  views integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- System notifications for maintenance alerts
create table if not exists public.system_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('maintenance', 'update', 'alert')),
  title text not null,
  message text not null,
  scheduled_time timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- User reports table for content moderation
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users(id) on delete cascade,
  reported_user_id uuid references public.users(id) on delete cascade,
  reported_content_id uuid,
  content_type text check (content_type in ('deal', 'comment', 'user')),
  reason text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Enhanced admin actions table
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'admin_actions' and column_name = 'ip_address') then
    alter table public.admin_actions add column ip_address inet;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'admin_actions' and column_name = 'user_agent') then
    alter table public.admin_actions add column user_agent text;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'admin_actions' and column_name = 'metadata') then
    alter table public.admin_actions add column metadata jsonb default '{}';
  end if;
exception when others then null; end $$;

-- Deal likes table for analytics
create table if not exists public.deal_likes (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(deal_id, user_id)
);

-- User activity tracking
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'last_seen') then
    alter table public.users add column last_seen timestamptz default now();
  end if;
exception when others then null; end $$;

-- Indexes for performance
create index if not exists admin_announcements_created_at_idx on public.admin_announcements(created_at desc);
create index if not exists admin_announcements_target_audience_idx on public.admin_announcements(target_audience);
create index if not exists user_reports_status_idx on public.user_reports(status);
create index if not exists user_reports_created_at_idx on public.user_reports(created_at desc);
create index if not exists deal_likes_deal_id_idx on public.deal_likes(deal_id);
create index if not exists users_last_seen_idx on public.users(last_seen desc);

-- RLS policies
alter table public.admin_announcements enable row level security;
alter table public.system_notifications enable row level security;
alter table public.user_reports enable row level security;
alter table public.deal_likes enable row level security;

-- Admin announcements policies
do $$ begin
  create policy if not exists "admin_announcements_select"
  on public.admin_announcements
  for select
  using (true); -- All users can read announcements
exception when others then null; end $$;

do $$ begin
  create policy if not exists "admin_announcements_admin_manage"
  on public.admin_announcements
  for all
  using (
    exists (
      select 1 from public.users 
      where id = auth.uid() 
      and role in ('admin', 'superadmin', 'super_admin')
    )
  );
exception when others then null; end $$;

-- User reports policies
do $$ begin
  create policy if not exists "user_reports_own_insert"
  on public.user_reports
  for insert
  with check (auth.uid() = reporter_id);
exception when others then null; end $$;

do $$ begin
  create policy if not exists "user_reports_admin_select"
  on public.user_reports
  for select
  using (
    exists (
      select 1 from public.users 
      where id = auth.uid() 
      and role in ('admin', 'superadmin', 'super_admin', 'moderator')
    )
  );
exception when others then null; end $$;

-- Deal likes policies
do $$ begin
  create policy if not exists "deal_likes_own_manage"
  on public.deal_likes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
exception when others then null; end $$;

-- Functions for analytics
create or replace function get_user_activity_stats(time_range interval default '30 days')
returns table (
  date_bucket date,
  active_users bigint,
  new_users bigint,
  deals_created bigint,
  comments_created bigint
)
language sql
security definer
as $$
  with date_series as (
    select date_trunc('day', generate_series(
      current_date - time_range,
      current_date,
      '1 day'::interval
    ))::date as date_bucket
  ),
  daily_stats as (
    select 
      date_trunc('day', u.last_seen)::date as activity_date,
      count(distinct u.id) as active_users
    from users u
    where u.last_seen >= current_date - time_range
    group by date_trunc('day', u.last_seen)::date
  ),
  new_users_stats as (
    select 
      date_trunc('day', u.created_at)::date as signup_date,
      count(*) as new_users
    from users u
    where u.created_at >= current_date - time_range
    group by date_trunc('day', u.created_at)::date
  ),
  deals_stats as (
    select 
      date_trunc('day', d.created_at)::date as deal_date,
      count(*) as deals_created
    from deals d
    where d.created_at >= current_date - time_range
    group by date_trunc('day', d.created_at)::date
  ),
  comments_stats as (
    select 
      date_trunc('day', c.created_at)::date as comment_date,
      count(*) as comments_created
    from comments c
    where c.created_at >= current_date - time_range
    group by date_trunc('day', c.created_at)::date
  )
  select 
    ds.date_bucket,
    coalesce(daily.active_users, 0) as active_users,
    coalesce(new_u.new_users, 0) as new_users,
    coalesce(deals.deals_created, 0) as deals_created,
    coalesce(comments.comments_created, 0) as comments_created
  from date_series ds
  left join daily_stats daily on daily.activity_date = ds.date_bucket
  left join new_users_stats new_u on new_u.signup_date = ds.date_bucket
  left join deals_stats deals on deals.deal_date = ds.date_bucket
  left join comments_stats comments on comments.comment_date = ds.date_bucket
  order by ds.date_bucket;
$$;

-- Update last_seen trigger
create or replace function update_user_last_seen()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.users 
  set last_seen = now() 
  where id = auth.uid();
  return null;
end;
$$;

-- Create trigger to update last_seen on user activity (would be called from app)
-- This is just a placeholder - in practice, you'd update last_seen from your application
