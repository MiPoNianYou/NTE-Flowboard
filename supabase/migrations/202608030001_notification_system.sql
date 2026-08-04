create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create table public.notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  server_region text not null check (server_region in ('asia', 'america', 'europe')),
  locale text not null check (locale in ('zh-CN', 'en-US')),
  before_reset_revision uuid not null default gen_random_uuid(),
  reset_revision uuid not null default gen_random_uuid(),
  before_reset_enabled boolean not null default true,
  reset_enabled boolean not null default true,
  lead_hours smallint not null default 6 check (lead_hours in (1, 3, 6, 12)),
  daily_visible_total integer not null default 0 check (daily_visible_total >= 0),
  daily_incomplete integer not null default 0 check (daily_incomplete >= 0),
  daily_cycle_started_at timestamptz not null,
  weekly_visible_total integer not null default 0 check (weekly_visible_total >= 0),
  weekly_incomplete integer not null default 0 check (weekly_incomplete >= 0),
  weekly_cycle_started_at timestamptz not null,
  monthly_visible_total integer not null default 0 check (monthly_visible_total >= 0),
  monthly_incomplete integer not null default 0 check (monthly_incomplete >= 0),
  monthly_cycle_started_at timestamptz not null,
  last_test_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.notification_subscriptions (id) on delete set null,
  delivery_key text not null,
  notification_type text not null check (notification_type in ('before-reset', 'reset', 'test')),
  scheduled_for timestamptz not null,
  expires_at timestamptz not null,
  status text not null check (status in ('sending', 'success', 'retry', 'permanent-failure')),
  attempt_count smallint not null default 1 check (attempt_count between 1 and 3),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subscription_id, delivery_key)
);

create table public.notification_system_config (
  id boolean primary key default true check (id),
  delivery_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.notification_system_config (id, delivery_enabled)
values (true, false)
on conflict (id) do nothing;

alter table public.notification_subscriptions enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.notification_system_config enable row level security;

revoke all on public.notification_subscriptions from anon, authenticated;
revoke all on public.notification_deliveries from anon, authenticated;
revoke all on public.notification_system_config from anon, authenticated;

create or replace function public.set_notification_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notification_subscriptions_updated_at
before update on public.notification_subscriptions
for each row execute function public.set_notification_updated_at();

create trigger notification_system_config_updated_at
before update on public.notification_system_config
for each row execute function public.set_notification_updated_at();

create or replace function public.claim_notification_delivery(
  p_subscription_id uuid,
  p_delivery_key text,
  p_notification_type text,
  p_scheduled_for timestamptz,
  p_expires_at timestamptz
)
returns table (delivery_id uuid, claimed_attempt_count smallint)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  insert into public.notification_deliveries (
    subscription_id,
    delivery_key,
    notification_type,
    scheduled_for,
    expires_at,
    status,
    attempt_count
  )
  values (
    p_subscription_id,
    p_delivery_key,
    p_notification_type,
    p_scheduled_for,
    p_expires_at,
    'sending',
    1
  )
  on conflict (subscription_id, delivery_key) do update
  set
    status = 'sending',
    attempt_count = notification_deliveries.attempt_count + 1,
    error_code = null,
    updated_at = now()
  where
    notification_deliveries.expires_at > now()
    and notification_deliveries.attempt_count < 3
    and (
      notification_deliveries.status = 'retry'
      or (
        notification_deliveries.status = 'sending'
        and notification_deliveries.updated_at < now() - interval '45 seconds'
      )
    )
  returning notification_deliveries.id, notification_deliveries.attempt_count;
end;
$$;

create or replace function public.claim_notification_test(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_id uuid;
begin
  update public.notification_subscriptions
  set last_test_at = now()
  where
    user_id = p_user_id
    and (last_test_at is null or last_test_at <= now() - interval '5 seconds')
  returning id into claimed_id;

  return claimed_id is not null;
end;
$$;

create or replace function public.cleanup_notification_deliveries()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.notification_deliveries
  where created_at < now() - interval '60 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.claim_notification_delivery(uuid, text, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.claim_notification_test(uuid) from public, anon, authenticated;
revoke all on function public.cleanup_notification_deliveries() from public, anon, authenticated;
grant execute on function public.claim_notification_delivery(uuid, text, text, timestamptz, timestamptz) to service_role;
grant execute on function public.claim_notification_test(uuid) to service_role;
grant execute on function public.cleanup_notification_deliveries() to service_role;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'cleanup-notification-deliveries';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'cleanup-notification-deliveries',
    '17 3 * * *',
    'select public.cleanup_notification_deliveries();'
  );
end;
$$;
