create table public.paid_whitelisting_entitlements (
  id uuid primary key default gen_random_uuid(),
  checkout_session_id text not null unique,
  buyer_id uuid not null references auth.users(id),
  athlete_id text not null,
  tier_id text not null,
  status text not null default 'pending_fulfilment'
    check (status in ('pending_fulfilment', 'active', 'revoked')),
  created_at timestamptz not null default now()
);

comment on table public.paid_whitelisting_entitlements is
  'Paid entitlement only, not proof of Meta/TikTok authorisation or delivery. Activation requires future real platform fulfilment.';
comment on column public.paid_whitelisting_entitlements.id is
  'Internal licence reference, not a Meta/TikTok authorisation token.';

alter table public.paid_whitelisting_entitlements enable row level security;
revoke all on public.paid_whitelisting_entitlements from anon, authenticated;
grant select on public.paid_whitelisting_entitlements to authenticated;
grant all on public.paid_whitelisting_entitlements to service_role;

create policy "Buyers may read their own paid entitlements"
  on public.paid_whitelisting_entitlements for select to authenticated
  using (buyer_id = auth.uid());
