-- ==============================================================================
-- TMRW PLATFORM: MASTER LICENCE MOU TRACKING + ATHLETE ABN / ELIGIBILITY
-- Supports the Talent Terminal upsert and the Athlete Agreement "Sign Digital MOU" action.
-- ==============================================================================

alter table public.athlete_profiles
  add column if not exists master_licence_mou_status text not null default 'unsigned',
  add column if not exists master_licence_signed_at timestamp with time zone,
  add column if not exists master_licence_mou_hash text,
  add column if not exists amateur_eligibility_maintained boolean not null default true,
  add column if not exists abn text;

-- Status lifecycle: unsigned -> signed (adult) | pending_guardian (minor, awaiting co-signature).
alter table public.athlete_profiles drop constraint if exists check_master_licence_mou_status;
alter table public.athlete_profiles
  add constraint check_master_licence_mou_status
  check (master_licence_mou_status in ('unsigned', 'signed', 'pending_guardian'));

-- Evidence requirements per state:
--   signed           -> athlete timestamp + SHA-256 (64 hex chars) fingerprint
--   pending_guardian -> athlete signature timestamp only (fingerprint issued on guardian co-signature)
alter table public.athlete_profiles drop constraint if exists check_master_licence_mou_evidence;
alter table public.athlete_profiles
  add constraint check_master_licence_mou_evidence
  check (
    master_licence_mou_status = 'unsigned'
    or (
      master_licence_mou_status = 'pending_guardian'
      and master_licence_signed_at is not null
    )
    or (
      master_licence_mou_status = 'signed'
      and master_licence_signed_at is not null
      and master_licence_mou_hash ~ '^[0-9a-f]{64}$'
    )
  );

-- Australian Business Number: exactly 11 digits when provided.
do $$ begin
  alter table public.athlete_profiles
    add constraint check_abn_format
    check (abn is null or abn ~ '^[0-9]{11}$');
exception when duplicate_object then null; end $$;

-- Audit log: first-class event type + document version for compliance queries.
-- (The immutability trigger only blocks UPDATE/DELETE, so adding columns is safe.)
alter table public.compliance_audit_logs
  add column if not exists event_type text,
  add column if not exists document_version text;

create index if not exists idx_compliance_audit_logs_event_type
  on public.compliance_audit_logs (event_type, record_id);
