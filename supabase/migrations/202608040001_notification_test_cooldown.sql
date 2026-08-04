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
    and (last_test_at is null or last_test_at <= now() - interval '3 seconds')
  returning id into claimed_id;

  return claimed_id is not null;
end;
$$;
