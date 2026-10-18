import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { normalizeAthlete, formatCurrency } from '../api';
import type { Athlete } from '../types';
import { AthletePortal } from './AthletePortal';

type MouStatus = 'unsigned' | 'signed' | 'pending_guardian';

/** Columns of public.athlete_profiles this dashboard reads. */
interface DashboardProfileRow {
  id: string;
  legal_full_name: string;
  display_name: string;
  sport_discipline: string;
  current_club: string | null;
  playing_position: string | null;
  representative_league: string | null;
  primary_postcode: string;
  market_valuation: number | string | null;
  match_fee: number | string | null;
  settlement_currency: string | null;
  is_minor: boolean;
  federation_name: string | null;
  compliance_status: string;
  stripe_account_id: string | null;
  abn: string | null;
  master_licence_mou_status: MouStatus | null;
  master_licence_signed_at: string | null;
}

const PROFILE_COLUMNS =
  'id, legal_full_name, display_name, sport_discipline, current_club, playing_position, representative_league, primary_postcode, market_valuation, match_fee, settlement_currency, is_minor, federation_name, compliance_status, stripe_account_id, abn, master_licence_mou_status, master_licence_signed_at';

const toNumber = (value: number | string | null | undefined): number => {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const MOU_LABEL: Record<MouStatus, string> = {
  unsigned: 'NOT SIGNED',
  signed: 'ACTIVE · 2-YEAR TERM',
  pending_guardian: 'PENDING GUARDIAN CO-SIGNATURE',
};

function toAthlete(row: DashboardProfileRow): Athlete {
  const mou = row.master_licence_mou_status ?? 'unsigned';
  return normalizeAthlete({
    id: row.id,
    name: row.display_name,
    full_name: row.legal_full_name,
    sport: row.sport_discipline,
    current_club: row.current_club,
    postcode: row.primary_postcode,
    master_licence_signed: mou === 'signed',
    master_licence_mou_status: mou,
    master_licence_signed_at: row.master_licence_signed_at,
    is_minor: row.is_minor,
    federation_name: row.federation_name,
    agreement_status: mou === 'signed' ? 'active' : 'no_agreement',
  });
}

interface AthleteCommercialDashboardProps {
  /** Return to the main Roster (landing) view. */
  onExit: () => void;
  /** Open the Talent Terminal to edit the operational profile. */
  onEditProfile: () => void;
}

export const AthleteCommercialDashboard: React.FC<AthleteCommercialDashboardProps> = ({
  onExit,
  onEditProfile,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<DashboardProfileRow | null>(null);
  const [focus, setFocus] = useState<'overview' | 'drops'>('overview');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        if (mountedRef.current) setError('Your session has ended. Return to the roster and sign in again.');
        return;
      }
      const { data, error: queryError } = await supabase
        .from('athlete_profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', user.id)
        .maybeSingle<DashboardProfileRow>();
      if (queryError) throw queryError;
      if (!mountedRef.current) return;
      if (!data) {
        setError('No athlete profile found. Complete your profile in the Talent Terminal first.');
        return;
      }
      setProfile(data);
    } catch (err) {
      console.error('Failed to load athlete commercial dashboard:', err);
      if (mountedRef.current) setError('We could not load your dashboard. Please try again.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const topBar = (
    <div className="sticky top-0 z-50 flex flex-wrap justify-between items-center gap-3 px-8 py-4 bg-black/80 backdrop-blur-md border-b border-white/10">
      <button
        type="button"
        onClick={onExit}
        data-testid="dashboard-back-to-roster"
        className="font-mono text-[10px] uppercase tracking-[0.2em] px-4 py-2 border border-white/20 text-white hover:border-[#D2FF00] hover:text-[#D2FF00] transition-colors"
      >
        ← Back to Roster [ESC]
      </button>
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#D2FF00]">
        ATHLETE COMMERCIAL DASHBOARD
      </span>
      <button
        type="button"
        onClick={onEditProfile}
        className="font-mono text-[10px] uppercase tracking-[0.2em] px-4 py-2 border border-white/20 text-white hover:border-[#D2FF00] hover:text-[#D2FF00] transition-colors"
      >
        Edit Talent Profile
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060709] text-white">
        {topBar}
        <div className="flex items-center justify-center py-32 font-mono text-[11px] tracking-[0.2em]">
          LOADING COMMERCIAL DASHBOARD...
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#060709] text-white">
        {topBar}
        <div className="max-w-xl mx-auto py-24 px-6 space-y-4">
          <div
            role="alert"
            className="border border-red-500/50 bg-red-500/10 px-4 py-3 font-mono text-[11px] tracking-[0.08em] text-red-300"
          >
            {error ?? 'Dashboard unavailable.'}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="font-mono text-[10px] uppercase tracking-[0.2em] px-4 py-2 border border-white/20 text-white hover:border-[#D2FF00] hover:text-[#D2FF00] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const currency = profile.settlement_currency ?? 'AUD';
  const mou = profile.master_licence_mou_status ?? 'unsigned';
  const stats: Array<{ label: string; value: string }> = [
    { label: 'Master Licence MOU', value: MOU_LABEL[mou] },
    { label: 'Compliance', value: profile.compliance_status.replace(/_/g, ' ').toUpperCase() },
    { label: 'Market Valuation', value: formatCurrency(toNumber(profile.market_valuation), currency) },
    { label: 'Match Fee (Ex GST)', value: formatCurrency(toNumber(profile.match_fee), currency) },
    { label: 'Payout Rail', value: profile.stripe_account_id ? 'STRIPE CONNECTED' : 'NOT CONNECTED' },
    { label: 'ABN', value: profile.abn ?? 'NOT PROVIDED' },
  ];

  return (
    <div className="min-h-screen bg-[#060709] text-white selection:bg-[#D2FF00] selection:text-black">
      {topBar}
      <div className="max-w-6xl mx-auto px-6 py-10 lg:px-16 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-white/10 border border-white/10">
          {stats.map((s) => (
            <div key={s.label} className="bg-[#060709] p-4">
              <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-white/60 mb-1">
                {s.label}
              </span>
              <span className="font-mono text-xs text-white">{s.value}</span>
            </div>
          ))}
        </div>
        {focus === 'drops' && (
          <button
            type="button"
            onClick={() => setFocus('overview')}
            className="font-mono text-[10px] uppercase tracking-[0.2em] px-4 py-2 border border-white/20 text-white hover:border-[#D2FF00] hover:text-[#D2FF00] transition-colors"
          >
            ← Back to overview
          </button>
        )}
        <AthletePortal
          athlete={toAthlete(profile)}
          focus={focus}
          onOpenDrops={() => setFocus('drops')}
        />
      </div>
    </div>
  );
};

export default AthleteCommercialDashboard;
