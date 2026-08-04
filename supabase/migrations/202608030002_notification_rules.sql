alter table public.notification_subscriptions
  add column if not exists before_reset_revision uuid not null default gen_random_uuid(),
  add column if not exists reset_revision uuid not null default gen_random_uuid();

alter table public.notification_subscriptions
  drop constraint if exists notification_subscriptions_lead_hours_check;

update public.notification_subscriptions
set lead_hours = 12
where lead_hours = 24;

alter table public.notification_subscriptions
  add constraint notification_subscriptions_lead_hours_check
  check (lead_hours in (1, 3, 6, 12));

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
