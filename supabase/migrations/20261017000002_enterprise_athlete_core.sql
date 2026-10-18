-- ==============================================================================
-- TMRW PLATFORM: ENTERPRISE BACKEND CORE INFRASTRUCTURE
-- ==============================================================================

-- 1. EXTENSIONS & SUPPORTING UTILITIES
create extension if not exists "uuid-ossp";

-- 2. CORE ENUMS & LOOKUPS
do $$ begin
  create type public.representation_type as enum ('self', 'agent', 'parent_guardian', 'coach');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.compliance_status as enum ('pending_compliance', 'cleared', 'restricted', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.agreement_status as enum ('no_agreement', 'active_agreement', 'expired', 'terminated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.escrow_status as enum ('draft', 'escrow_locked', 'deliverable_submitted', 'cleared_payout', 'disputed');
exception when duplicate_object then null; end $$;

-- 3. ATHLETE OPERATIONAL PROFILES
create table if not exists public.athlete_profiles (
  id uuid references public.profiles(id) on delete cascade primary key,
  legal_full_name text not null,
  display_name text not null,
  sport_discipline text not null,
  current_club text,
  playing_position text,
  representative_league text,
  primary_postcode text not null,
  
  -- Financial clearance parameters
  market_valuation numeric(12,2) default 0.00 check (market_valuation >= 0),
  match_fee numeric(12,2) default 0.00 check (match_fee >= 0),
  settlement_currency text default 'AUD' check (settlement_currency in ('AUD', 'NZD', 'USD')),
  stripe_account_id text,
  
  -- Enterprise compliance and eligibility controls
  compliance_status public.compliance_status default 'pending_compliance' not null,
  agreement_status public.agreement_status default 'no_agreement' not null,
  is_minor boolean default false not null,
  date_of_birth date,
  guardian_email text,
  guardian_consent_recorded boolean default false not null,
  federation_name text,
  federation_clearance_status text default 'not_required',
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure minors must have guardian contact details provided
  constraint check_guardian_required check (
    (is_minor = false) or (is_minor = true and guardian_email is not null)
  )
);

-- 4. MULTI-PARTY REPRESENTATION & AGENCY DELEGATION
create table if not exists public.athlete_representatives (
  id uuid default gen_random_uuid() primary key,
  athlete_id uuid references public.athlete_profiles(id) on delete cascade not null,
  representative_profile_id uuid references public.profiles(id) on delete cascade not null,
  relationship_type public.representation_type not null,
  is_verified boolean default false not null,
  can_negotiate boolean default true not null,
  can_sign_agreements boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (athlete_id, representative_profile_id)
);

-- 5. MILESTONE ESCROW & CAPITAL DEPLOYMENT
create table if not exists public.sponsorship_deals (
  id uuid default gen_random_uuid() primary key,
  athlete_id uuid references public.athlete_profiles(id) on delete restrict not null,
  sponsor_id uuid references public.profiles(id) on delete restrict not null,
  title text not null,
  deal_value numeric(12,2) not null check (deal_value > 0),
  currency text default 'AUD' not null check (currency in ('AUD', 'NZD', 'USD')),
  escrow_state public.escrow_status default 'draft' not null,
  deliverable_terms text not null,
  proof_submission_url text,
  payout_released_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. IMMUTABLE AUDIT TRAIL
create table if not exists public.compliance_audit_logs (
  id uuid default gen_random_uuid() primary key,
  entity_type text not null,
  record_id uuid not null,
  action text not null,
  actor_id uuid references auth.users(id),
  change_payload jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enforce strict audit immutability at the database engine level
create or replace function public.enforce_audit_immutability()
returns trigger as $$
begin
  raise exception 'Audit logs are immutable and cannot be updated or deleted.';
end;
$$ language plpgsql;

drop trigger if exists tr_enforce_audit_immutability on public.compliance_audit_logs;
create trigger tr_enforce_audit_immutability
  before update or delete on public.compliance_audit_logs
  for each row execute procedure public.enforce_audit_immutability();

-- 7. AUTOMATED UPDATED_AT TIMESTAMP TRIGGER
create or replace function public.sync_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists tr_athlete_profiles_updated on public.athlete_profiles;
create trigger tr_athlete_profiles_updated
  before update on public.athlete_profiles
  for each row execute procedure public.sync_updated_at();

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.athlete_profiles enable row level security;
alter table public.athlete_representatives enable row level security;
alter table public.sponsorship_deals enable row level security;
alter table public.compliance_audit_logs enable row level security;

-- Athlete Profiles: Athletes access their own; verified representatives access managed profiles
create policy "Athletes manage their own profile"
  on public.athlete_profiles for all
  to authenticated
  using (
    auth.uid() = id or 
    exists (
      select 1 from public.athlete_representatives
      where athlete_id = public.athlete_profiles.id 
      and representative_profile_id = auth.uid() 
      and is_verified = true
    )
  )
  with check (
    auth.uid() = id or 
    exists (
      select 1 from public.athlete_representatives
      where athlete_id = public.athlete_profiles.id 
      and representative_profile_id = auth.uid() 
      and is_verified = true
      and can_negotiate = true
    )
  );

-- Sanitised public roster view for enterprise discovery without exposing raw valuations
create or replace view public.roster_directory as
  select 
    id,
    display_name,
    sport_discipline,
    current_club,
    playing_position,
    representative_league,
    primary_postcode,
    compliance_status,
    is_minor
  from public.athlete_profiles
  where compliance_status = 'cleared';

-- Sponsorship Deals: Parties involved have visibility
create policy "Deal parties can view and update agreements"
  on public.sponsorship_deals for all
  to authenticated
  using (
    auth.uid() = sponsor_id or 
    auth.uid() = athlete_id or 
    exists (
      select 1 from public.athlete_representatives
      where athlete_id = public.sponsorship_deals.athlete_id 
      and representative_profile_id = auth.uid() 
      and is_verified = true
    )
  );

-- Audit Logs: Viewable only by involved authenticated actors
create policy "Actors view their own audit records"
  on public.compliance_audit_logs for select
  to authenticated
  using (actor_id = auth.uid());

create policy "System can insert audit logs"
  on public.compliance_audit_logs for insert
  to authenticated
  with check (actor_id = auth.uid());

-- 9. ASSET STORAGE BUCKETS & ISOLATION
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) 
values ('documents', 'documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) 
values ('deliverables', 'deliverables', false)
on conflict (id) do nothing;

create policy "Public avatar access"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy "Authenticated avatar uploads"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Private document access"
  on storage.objects for select
  to authenticated
  using (
    bucket_id in ('documents', 'deliverables') and 
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Private document uploads"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('documents', 'deliverables') and 
    (storage.foldername(name))[1] = auth.uid()::text
  );