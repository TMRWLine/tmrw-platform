-- 1. CREATE CORE SPONSOR DEALS TABLE
create table if not exists public.sponsor_deals (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references public.athlete_profiles(id) on delete cascade,
  sponsor_id uuid,
  tier_code text not null check (tier_code in ('tier1', 'tier2', 'tier3')),
  total_amount_aud numeric(12,2) not null,
  escrow_balance_aud numeric(12,2) not null default 0,
  status text not null default 'escrowed' check (status in ('pending', 'escrowed', 'active', 'completed', 'disputed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. EXTEND ATHLETE PROFILES FOR SCHOOL & PATHWAY CLEARANCE
alter table public.athlete_profiles 
add column if not exists school_association text default 'GPS / CAS / Independent',
add column if not exists school_clearance_recorded boolean default true,
add column if not exists pathway_category text default 'Under-18 Emerging';

-- 3. CREATE RECIPIENT CREATED TAX INVOICES TABLE (RCTI)
create table if not exists public.rcti_invoices (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.sponsor_deals(id) on delete cascade,
  athlete_id uuid references public.athlete_profiles(id) on delete cascade,
  sponsor_abn text not null,
  athlete_abn text,
  gross_amount_aud numeric(12,2) not null,
  grassroots_fund_aud numeric(12,2) not null,
  platform_fee_aud numeric(12,2) not null,
  net_athlete_payout_aud numeric(12,2) not null,
  gst_included boolean default true,
  invoice_pdf_hash text,
  created_at timestamptz default now()
);

-- 4. CREATE PROOF OF ACTIVATION MILESTONES TABLE
create table if not exists public.activation_milestones (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.sponsor_deals(id) on delete cascade,
  athlete_id uuid references public.athlete_profiles(id) on delete cascade,
  milestone_title text not null,
  required_deliverable text not null,
  proof_url text,
  geotag_postcode text,
  verification_status text default 'pending_review' check (verification_status in ('pending_review', 'verified', 'disputed')),
  payout_released boolean default false,
  verified_at timestamptz,
  created_at timestamptz default now()
);

-- 5. CREATE FEDERATION BROADCAST EXCLUSIONS DIRECTORY
create table if not exists public.federation_broadcast_restrictions (
  id uuid primary key default gen_random_uuid(),
  sport_discipline text not null,
  league text not null,
  prohibited_sponsor_categories text[] not null,
  notes text,
  created_at timestamptz default now()
);

insert into public.federation_broadcast_restrictions 
(sport_discipline, league, prohibited_sponsor_categories, notes)
values
('Basketball', 'NBL1', array['Wagering', 'Vaping', 'Adult Entertainment', 'Energy Drinks'], 'Bylaw 14.2 Category Lockout'),
('Rugby Union', 'Shute Shield', array['Sports Betting', 'Vaping', 'Tobacco'], 'NSWRU Commercial Guidelines 2026'),
('Football', 'NPL NSW', array['Gambling', 'Alcohol Under-18', 'Vaping'], 'Football Australia National Policy')
on conflict do nothing;

-- 6. FUNCTION TO GENERATE AUDIT-COMPLIANT RCTI SPLITS (70/20/10)
create or replace function public.generate_deal_rcti(p_deal_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_deal record;
  v_athlete record;
  v_grassroots numeric(12,2);
  v_platform numeric(12,2);
  v_net numeric(12,2);
  v_rcti_id uuid;
begin
  select * into v_deal from public.sponsor_deals where id = p_deal_id;
  if v_deal is null then
    return jsonb_build_object('success', false, 'error', 'Deal not found');
  end if;

  select * into v_athlete from public.athlete_profiles where id = v_deal.athlete_id;

  v_grassroots := round((v_deal.total_amount_aud * 0.10), 2);
  v_platform := round((v_deal.total_amount_aud * 0.20), 2);
  v_net := round((v_deal.total_amount_aud * 0.70), 2);

  insert into public.rcti_invoices (
    deal_id,
    athlete_id,
    sponsor_abn,
    athlete_abn,
    gross_amount_aud,
    grassroots_fund_aud,
    platform_fee_aud,
    net_athlete_payout_aud,
    invoice_pdf_hash
  ) values (
    v_deal.id,
    v_deal.athlete_id,
    '44111222333',
    coalesce(v_athlete.abn, 'UNREGISTERED_HOBBY'),
    v_deal.total_amount_aud,
    v_grassroots,
    v_platform,
    v_net,
    md5(v_deal.id::text || now()::text)
  )
  returning id into v_rcti_id;

  return jsonb_build_object(
    'success', true,
    'rcti_id', v_rcti_id,
    'gross_aud', v_deal.total_amount_aud,
    'athlete_net_aud', v_net,
    'grassroots_fund_aud', v_grassroots,
    'platform_fee_aud', v_platform
  );
end;
$$;

-- 7. GRANT PERMISSIONS AND NOTIFY SCHEMA RELOAD
grant select, insert, update on public.sponsor_deals to anon, authenticated, service_role;
grant select, insert on public.rcti_invoices to anon, authenticated, service_role;
grant select, insert, update on public.activation_milestones to anon, authenticated, service_role;
grant select on public.federation_broadcast_restrictions to anon, authenticated, service_role;
grant execute on function public.generate_deal_rcti(uuid) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
