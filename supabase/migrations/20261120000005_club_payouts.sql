create table public.club_payouts (
  id uuid primary key default gen_random_uuid(),
  checkout_session_id text not null,
  charge_id text not null unique,
  transfer_group text not null,
  athlete_id uuid not null references public.athlete_profiles(id),
  club_name text,
  amount_cents bigint not null check (amount_cents > 0),
  cadence text not null check (cadence in ('quarterly_batch', 'immediate_t0')),
  status text not null check (status in ('queued_quarterly', 'awaiting_club_connect_account')),
  scheduled_for timestamptz,
  stripe_transfer_id text,
  created_at timestamptz not null default now(),
  check ((cadence = 'quarterly_batch' and status = 'queued_quarterly' and scheduled_for is not null)
    or (cadence = 'immediate_t0' and status = 'awaiting_club_connect_account' and scheduled_for is null))
);

alter table public.club_payouts enable row level security;
revoke all on public.club_payouts from anon, authenticated;
grant select, insert, update on public.club_payouts to service_role;
