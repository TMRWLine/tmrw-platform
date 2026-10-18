import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { ABN_ERROR_MESSAGE, isValidAbn, stripNonDigits } from '../lib/validation';
import { buildGuardianVerifyUrl } from './GuardianVerifyPage';

const SETTLEMENT_CURRENCIES = ['AUD', 'NZD', 'USD'] as const;
type SettlementCurrency = (typeof SETTLEMENT_CURRENCIES)[number];

type ComplianceStatus = 'pending_compliance' | 'cleared' | 'restricted' | 'suspended';

/** Row shape of public.athlete_profiles (only the columns this form reads/writes). */
interface AthleteProfileRow {
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
  settlement_currency: SettlementCurrency | null;
  is_minor: boolean;
  guardian_email: string | null;
  amateur_eligibility_maintained: boolean;
  abn: string | null;
  abn_verified: boolean;
  guardian_token: string | null;
  guardian_signed_at: string | null;
  stripe_account_id: string | null;
  compliance_status: ComplianceStatus;
}

/** Writable columns upserted by the form. Compliance/agreement fields are never sent from the client. */
type AthleteProfileUpsert = Pick<
  AthleteProfileRow,
  | 'id'
  | 'legal_full_name'
  | 'display_name'
  | 'sport_discipline'
  | 'current_club'
  | 'playing_position'
  | 'representative_league'
  | 'primary_postcode'
  | 'settlement_currency'
  | 'is_minor'
  | 'guardian_email'
  | 'amateur_eligibility_maintained'
  | 'abn'
  | 'abn_verified'
  | 'guardian_token'
> & {
  market_valuation: number;
  match_fee: number;
};

/** Form state keeps every input as a string so empty/partial input is representable. */
interface ProfileFormState {
  legal_full_name: string;
  display_name: string;
  sport_discipline: string;
  current_club: string;
  playing_position: string;
  representative_league: string;
  primary_postcode: string;
  market_valuation: string;
  match_fee: string;
  settlement_currency: SettlementCurrency;
  is_minor: boolean;
  guardian_email: string;
  amateur_eligibility_maintained: boolean;
  abn: string;
  abn_verified: boolean;
}

const EMPTY_FORM: ProfileFormState = {
  legal_full_name: '',
  display_name: '',
  sport_discipline: '',
  current_club: '',
  playing_position: '',
  representative_league: '',
  primary_postcode: '',
  market_valuation: '0',
  match_fee: '0',
  settlement_currency: 'AUD',
  is_minor: false,
  guardian_email: '',
  amateur_eligibility_maintained: true,
  abn: '',
  abn_verified: false,
};

const FIELD_LABELS: Record<string, string> = {
  legal_full_name: 'Legal full name',
  display_name: 'Display name',
  sport_discipline: 'Sport discipline',
  primary_postcode: 'Primary postcode',
  market_valuation: 'Market valuation',
  match_fee: 'Match fee',
  settlement_currency: 'Settlement currency',
  current_club: 'Current club',
  playing_position: 'Playing position',
  representative_league: 'Representative league',
  guardian_email: 'Guardian email',
  abn: 'ABN',
};

// Postgres numeric(12,2) holds at most 10 integer digits.
const MAX_MONEY = 9_999_999_999.99;

const isSettlementCurrency = (value: string): value is SettlementCurrency =>
  (SETTLEMENT_CURRENCIES as readonly string[]).includes(value);

const toNumber = (value: number | string | null | undefined): number => {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const emptyToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fieldFromText = (text: string): string | null => {
  // Matches `column "foo"` / `"foo"` / constraint names like athlete_profiles_market_valuation_check
  const columnMatch = text.match(/column "([a-z_]+)"/i);
  if (columnMatch) return columnMatch[1];
  for (const key of Object.keys(FIELD_LABELS)) {
    if (text.includes(key)) return key;
  }
  return null;
};

/** Validate locally so the common failure modes never reach the network. */
const validateForm = (form: ProfileFormState): string | null => {
  const required: Array<'legal_full_name' | 'display_name' | 'sport_discipline' | 'primary_postcode'> = [
    'legal_full_name',
    'display_name',
    'sport_discipline',
    'primary_postcode',
  ];
  for (const key of required) {
    if (form[key].trim() === '') return `${FIELD_LABELS[key]} is required.`;
  }

  for (const key of ['market_valuation', 'match_fee'] as const) {
    const raw = form[key].trim();
    const value = raw === '' ? 0 : Number(raw);
    if (!Number.isFinite(value)) return `${FIELD_LABELS[key]} must be a valid number.`;
    if (value < 0) return `${FIELD_LABELS[key]} cannot be negative.`;
    if (value > MAX_MONEY) return `${FIELD_LABELS[key]} exceeds the maximum allowed amount.`;
  }

  if (!isSettlementCurrency(form.settlement_currency)) {
    return `Settlement currency must be one of ${SETTLEMENT_CURRENCIES.join(', ')}.`;
  }

  if (form.is_minor) {
    const email = form.guardian_email.trim();
    if (email === '') return 'Guardian email is required for athletes under 18.';
    if (!EMAIL_PATTERN.test(email)) return 'Guardian email must be a valid email address.';
  }

  if (form.abn.trim() !== '' && !isValidAbn(form.abn)) return `${ABN_ERROR_MESSAGE}.`;
  return null;
};

/** Translate a Postgres/PostgREST error into a deterministic, user-facing message. */
const describeSupabaseError = (error: Pick<PostgrestError, 'code' | 'message' | 'details'>): string => {
  const text = `${error.message ?? ''} ${error.details ?? ''}`;
  const field = fieldFromText(text);
  const label = field ? FIELD_LABELS[field] ?? field : null;

  switch (error.code) {
    case '23502': // not_null_violation
      return label ? `${label} is required.` : 'A required field is missing.';
    case '23514': // check_violation
      if (text.includes('market_valuation')) return 'Market valuation cannot be negative.';
      if (text.includes('match_fee')) return 'Match fee cannot be negative.';
      if (text.includes('check_guardian_required')) return 'Guardian email is required for athletes under 18.';
      if (text.includes('check_abn_format')) return `${ABN_ERROR_MESSAGE}.`;
      if (text.includes('settlement_currency')) {
        return `Settlement currency must be one of ${SETTLEMENT_CURRENCIES.join(', ')}.`;
      }
      return 'One of the values you entered is not allowed. Please review the form.';
    case '23503': // foreign_key_violation
      return 'Your account setup is incomplete (no base user profile found). Please sign out and back in, then retry.';
    case '22003': // numeric_value_out_of_range
      return 'A monetary amount is too large.';
    case '22P02': // invalid_text_representation
    case '22007': // invalid_datetime_format
      return 'One of the values has an invalid format.';
    case '42501': // insufficient_privilege (RLS)
      return 'You do not have permission to save this profile. Please sign in again.';
    case 'PGRST301': // JWT expired / invalid
      return 'Your session has expired. Please sign in again.';
    default:
      return 'We could not save your profile right now. Please try again.';
  }
};

const inputClass =
  'w-full bg-[#0E1015] border border-white/20 px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#D2FF00] transition-colors disabled:opacity-60';
const labelClass = 'block font-mono text-[9px] uppercase tracking-[0.2em] text-white/60 mb-2';

interface AthleteProfileManagerProps {
  /** Return to the main Roster (landing) view. */
  onExit?: () => void;
  /** Called after the profile upsert succeeds (e.g. to route to the Commercial Dashboard). */
  onSaved?: () => void;
  /** Open the sign-in gateway when there is no authenticated session. */
  onRequestSignIn?: () => void;
}

export const AthleteProfileManager: React.FC<AthleteProfileManagerProps> = ({
  onExit,
  onSaved,
  onRequestSignIn,
}) => {
  const [loading, setLoading] = useState(true);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus>('pending_compliance');
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProfileFormState>(EMPTY_FORM);
  const [abnTouched, setAbnTouched] = useState(false);
  /** Persisted guardian state; used to keep an issued token stable across saves. */
  const [guardian, setGuardian] = useState<{ token: string | null; email: string | null; signedAt: string | null }>({
    token: null,
    email: null,
    signedAt: null,
  });

  // Synchronous guard: state updates are async, so two fast clicks could both pass `saving`.
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!onExit) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit]);

  const fetchProfile = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (mountedRef.current) setUnauthenticated(true);
        return;
      }
      if (mountedRef.current) setUnauthenticated(false);

      const { data, error } = await supabase
        .from('athlete_profiles')
        .select(
          'id, legal_full_name, display_name, sport_discipline, current_club, playing_position, representative_league, primary_postcode, market_valuation, match_fee, settlement_currency, is_minor, guardian_email, amateur_eligibility_maintained, abn, abn_verified, guardian_token, guardian_signed_at, stripe_account_id, compliance_status'
        )
        .eq('id', user.id)
        .maybeSingle<AthleteProfileRow>();

      if (error) throw error;
      if (!data || !mountedRef.current) return;

      setFormData({
        legal_full_name: data.legal_full_name ?? '',
        display_name: data.display_name ?? '',
        sport_discipline: data.sport_discipline ?? '',
        current_club: data.current_club ?? '',
        playing_position: data.playing_position ?? '',
        representative_league: data.representative_league ?? '',
        primary_postcode: data.primary_postcode ?? '',
        market_valuation: String(toNumber(data.market_valuation)),
        match_fee: String(toNumber(data.match_fee)),
        settlement_currency: data.settlement_currency ?? 'AUD',
        is_minor: data.is_minor ?? false,
        guardian_email: data.guardian_email ?? '',
        amateur_eligibility_maintained: data.amateur_eligibility_maintained ?? true,
        abn: data.abn ?? '',
        abn_verified: isValidAbn(data.abn ?? ''),
      });
      setGuardian({
        token: data.guardian_token ?? null,
        email: data.guardian_email ?? null,
        signedAt: data.guardian_signed_at ?? null,
      });
      setStripeAccountId(data.stripe_account_id);
      setComplianceStatus(data.compliance_status);
      setProfileSaved(true);
    } catch (err) {
      console.error('Failed to load athlete profile:', err);
      if (mountedRef.current) {
        setSaveError('We could not load your saved profile. You can still complete and save the form.');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const next = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({
      ...prev,
      [name]: next,
      // Offline Modulus 89 check: verification toggles automatically as the ABN is typed.
      ...(name === 'abn' ? { abn_verified: isValidAbn(String(next)) } : {}),
    }));
    setSaveError(null);
    setJustSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlightRef.current) return;

    setJustSaved(false);
    const validationError = validateForm(formData);
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    inFlightRef.current = true;
    setSaving(true);
    setSaveError(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setUnauthenticated(true);
        setSaveError('You must be signed in to save your athlete profile.');
        onRequestSignIn?.();
        return;
      }

      const abnDigits = stripNonDigits(formData.abn);
      const guardianEmail = formData.is_minor ? formData.guardian_email.trim() : null;
      // Minors get a guardian_token UUID. An issued token is kept (so a link already sent stays valid)
      // unless the guardian email changed, in which case it is rotated to revoke the previous recipient.
      const guardianToken = !formData.is_minor
        ? null
        : guardian.token && guardian.email?.toLowerCase() === guardianEmail?.toLowerCase()
          ? guardian.token
          : crypto.randomUUID();

      const payload: AthleteProfileUpsert = {
        id: user.id,
        legal_full_name: formData.legal_full_name.trim(),
        display_name: formData.display_name.trim(),
        sport_discipline: formData.sport_discipline.trim(),
        current_club: emptyToNull(formData.current_club),
        playing_position: emptyToNull(formData.playing_position),
        representative_league: emptyToNull(formData.representative_league),
        primary_postcode: formData.primary_postcode.trim(),
        market_valuation: formData.market_valuation.trim() === '' ? 0 : Number(formData.market_valuation),
        match_fee: formData.match_fee.trim() === '' ? 0 : Number(formData.match_fee),
        settlement_currency: formData.settlement_currency,
        is_minor: formData.is_minor,
        // DB constraint: guardian_email is mandatory for minors; never persist a stale one for adults.
        guardian_email: guardianEmail,
        guardian_token: guardianToken,
        amateur_eligibility_maintained: formData.amateur_eligibility_maintained,
        abn: abnDigits === '' ? null : abnDigits,
        abn_verified: abnDigits !== '' && isValidAbn(abnDigits),
      };

      const { data, error } = await supabase
        .from('athlete_profiles')
        .upsert(payload, { onConflict: 'id' })
        .select('compliance_status, stripe_account_id, guardian_token, guardian_signed_at, guardian_email')
        .single<
          Pick<
            AthleteProfileRow,
            'compliance_status' | 'stripe_account_id' | 'guardian_token' | 'guardian_signed_at' | 'guardian_email'
          >
        >();

      if (error) {
        console.error('Supabase rejected athlete profile upsert:', error);
        setSaveError(describeSupabaseError(error));
        return;
      }

      setComplianceStatus(data.compliance_status);
      setStripeAccountId(data.stripe_account_id);
      setGuardian({
        token: data.guardian_token ?? null,
        email: data.guardian_email ?? null,
        signedAt: data.guardian_signed_at ?? null,
      });
      setProfileSaved(true);
      setJustSaved(true);
      setUnauthenticated(false);
      onSaved?.();
    } catch (err) {
      // Network failures and any other thrown errors land here — never leave them unhandled.
      console.error('Unexpected failure saving athlete profile:', err);
      setSaveError('Network error while saving your profile. Check your connection and try again.');
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setSaving(false);
    }
  };

  const exitBar = onExit ? (
    <div className="sticky top-0 z-40 flex justify-between items-center px-8 py-4 bg-black/80 backdrop-blur-md border-b border-white/10">
      <button
        type="button"
        onClick={onExit}
        data-testid="terminal-back-to-roster"
        className="font-mono text-[10px] uppercase tracking-[0.2em] px-4 py-2 border border-white/20 text-white hover:border-[#D2FF00] hover:text-[#D2FF00] transition-colors"
      >
        ← Back to Roster [ESC]
      </button>
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#D2FF00]">
        TALENT OPERATIONAL CONSOLE
      </span>
    </div>
  ) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060709] text-white">
        {exitBar}
        <div className="flex items-center justify-center py-32 font-mono text-[11px] tracking-[0.2em]">
          INITIALISING TALENT PROFILE...
        </div>
      </div>
    );
  }

  // Minors cannot be submitted without a guardian contact (mirrors DB constraint check_guardian_required).
  const guardianMissing = formData.is_minor && !EMAIL_PATTERN.test(formData.guardian_email.trim());
  const submitDisabled = saving || guardianMissing;

  const abnDigitCount = stripNonDigits(formData.abn).length;
  const abnInvalid = formData.abn.trim() !== '' && !formData.abn_verified && (abnTouched || abnDigitCount >= 11);
  const guardianLink =
    formData.is_minor && guardian.token && guardian.email === formData.guardian_email.trim()
      ? buildGuardianVerifyUrl(guardian.token)
      : null;

  const isCleared = complianceStatus === 'cleared';
  const badgeLabel = isCleared
    ? 'VERIFIED TALENT'
    : profileSaved
      ? 'PROFILE ACTIVE'
      : 'PENDING COMPLIANCE';
  const badgeClass =
    isCleared || profileSaved ? 'border-[#D2FF00] text-[#D2FF00]' : 'border-amber-400 text-amber-400';

  return (
    <div className="min-h-screen bg-[#060709] text-white selection:bg-[#D2FF00] selection:text-black">
      {exitBar}
      <div className="px-6 py-12 lg:px-16">
      <div className="max-w-4xl mx-auto border border-white/15 bg-black/40 backdrop-blur-md p-8 md:p-12 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-6 mb-8 gap-4">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#D2FF00] font-semibold">
              // ATHLETE OPERATIONAL PROFILE
            </span>
            <h1 className="text-3xl font-extrabold uppercase tracking-tight mt-1">
              {formData.display_name || formData.legal_full_name || 'TALENT TERMINAL'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span
              data-testid="profile-status-badge"
              className={`font-mono text-[9px] uppercase tracking-[0.16em] px-3 py-1 rounded-full border ${badgeClass}`}
            >
              {badgeLabel}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] px-3 py-1 rounded-full border border-white/20 text-white/70">
              COMPLIANCE: {complianceStatus.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {unauthenticated && (
          <div
            role="status"
            data-testid="terminal-signin-prompt"
            className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-amber-400/50 bg-amber-400/10 px-4 py-3 font-mono text-[11px] tracking-[0.08em] text-amber-200"
          >
            <span>You are not signed in. Sign in to save your athlete profile.</span>
            {onRequestSignIn && (
              <button
                type="button"
                onClick={onRequestSignIn}
                className="px-4 py-2 border border-amber-400 text-amber-300 hover:bg-amber-400 hover:text-black uppercase tracking-[0.16em] text-[10px] transition-colors"
              >
                Sign in
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSave} noValidate aria-busy={saving} className="space-y-8">
          <fieldset disabled={saving} className="space-y-8 min-w-0 border-0 p-0 m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="legal_full_name" className={labelClass}>
                  Legal Full Name
                </label>
                <input
                  id="legal_full_name"
                  type="text"
                  name="legal_full_name"
                  value={formData.legal_full_name}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="display_name" className={labelClass}>
                  Display Name (Roster)
                </label>
                <input
                  id="display_name"
                  type="text"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="sport_discipline" className={labelClass}>
                  Sport Discipline
                </label>
                <input
                  id="sport_discipline"
                  type="text"
                  name="sport_discipline"
                  value={formData.sport_discipline}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="current_club" className={labelClass}>
                  Current Club (Optional)
                </label>
                <input
                  id="current_club"
                  type="text"
                  name="current_club"
                  value={formData.current_club}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="playing_position" className={labelClass}>
                  Playing Position (Optional)
                </label>
                <input
                  id="playing_position"
                  type="text"
                  name="playing_position"
                  value={formData.playing_position}
                  onChange={handleChange}
                  placeholder="e.g. Flyhalf, Point Guard"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="representative_league" className={labelClass}>
                  Representative League (Optional)
                </label>
                <input
                  id="representative_league"
                  type="text"
                  name="representative_league"
                  value={formData.representative_league}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="primary_postcode" className={labelClass}>
                  Primary Postcode (Geospatial Anchor)
                </label>
                <input
                  id="primary_postcode"
                  type="text"
                  name="primary_postcode"
                  value={formData.primary_postcode}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div className="border-t border-white/10 pt-6">
              <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-white/60 mb-4 block">
                // FINANCIAL PARAMETERS & COMMERCIAL CLEARANCE
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="market_valuation" className={labelClass}>
                    Market Valuation
                  </label>
                  <input
                    id="market_valuation"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    name="market_valuation"
                    value={formData.market_valuation}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="match_fee" className={labelClass}>
                    Match Fee (Ex GST)
                  </label>
                  <input
                    id="match_fee"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    name="match_fee"
                    value={formData.match_fee}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="settlement_currency" className={labelClass}>
                    Settlement Currency
                  </label>
                  <select
                    id="settlement_currency"
                    name="settlement_currency"
                    value={formData.settlement_currency}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="AUD">AUD ($)</option>
                    <option value="NZD">NZD ($)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6">
              <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-white/60 mb-4 block">
                // ELIGIBILITY, GUARDIANSHIP & TAX
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label htmlFor="is_minor" className="flex items-center gap-3 font-mono text-xs text-white cursor-pointer">
                  <input
                    id="is_minor"
                    type="checkbox"
                    name="is_minor"
                    checked={formData.is_minor}
                    onChange={handleChange}
                    className="h-4 w-4 accent-[#D2FF00]"
                  />
                  Athlete is under 18 (minor)
                </label>
                <label
                  htmlFor="amateur_eligibility_maintained"
                  className="flex items-center gap-3 font-mono text-xs text-white cursor-pointer"
                >
                  <input
                    id="amateur_eligibility_maintained"
                    type="checkbox"
                    name="amateur_eligibility_maintained"
                    checked={formData.amateur_eligibility_maintained}
                    onChange={handleChange}
                    className="h-4 w-4 accent-[#D2FF00]"
                  />
                  Amateur eligibility maintained
                </label>
                {formData.is_minor && (
                  <div>
                    <label htmlFor="guardian_email" className={labelClass}>
                      Guardian Email (Required for Minors)
                    </label>
                    <input
                      id="guardian_email"
                      type="email"
                      name="guardian_email"
                      value={formData.guardian_email}
                      onChange={handleChange}
                      required
                      autoComplete="email"
                      className={inputClass}
                    />
                    {guardian.signedAt ? (
                      <p
                        role="status"
                        data-testid="guardian-signed-status"
                        className="mt-2 font-mono text-[10px] tracking-[0.08em] text-emerald-300"
                      >
                        Guardian countersigned {new Date(guardian.signedAt).toLocaleDateString('en-AU')}.
                      </p>
                    ) : guardianLink ? (
                      <div className="mt-2 space-y-1" data-testid="guardian-link-block">
                        <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-white/60">
                          Guardian signing link — send to your guardian
                        </span>
                        <input
                          type="text"
                          readOnly
                          value={guardianLink}
                          onFocus={(e) => e.currentTarget.select()}
                          aria-label="Guardian signing link"
                          className={`${inputClass} text-[11px]`}
                        />
                      </div>
                    ) : (
                      <p className="mt-2 font-mono text-[10px] tracking-[0.08em] text-white/50">
                        A guardian signing link is generated when you save your profile.
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="abn" className={labelClass}>
                      ABN (Optional)
                    </label>
                    {formData.abn_verified && (
                      <span
                        data-testid="abn-verified-badge"
                        className="mb-2 inline-flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-400/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-emerald-300"
                      >
                        <span aria-hidden="true">✓</span> ABN Verified
                      </span>
                    )}
                  </div>
                  <input
                    id="abn"
                    type="text"
                    inputMode="numeric"
                    name="abn"
                    value={formData.abn}
                    onChange={handleChange}
                    onBlur={() => setAbnTouched(true)}
                    placeholder="11 digits"
                    maxLength={14}
                    aria-invalid={abnInvalid}
                    aria-describedby={abnInvalid ? 'abn-error' : undefined}
                    className={`${inputClass} ${
                      formData.abn_verified
                        ? 'border-emerald-400/60'
                        : abnInvalid
                          ? 'border-amber-400/70'
                          : ''
                    }`}
                  />
                  {abnInvalid && (
                    <p
                      id="abn-error"
                      role="alert"
                      data-testid="abn-invalid-warning"
                      className="mt-2 font-mono text-[10px] tracking-[0.08em] text-amber-300"
                    >
                      {ABN_ERROR_MESSAGE}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </fieldset>

          <div className="border border-white/10 p-4 bg-[#0A0C10] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/60">
                Stripe Express Payout Rail
              </span>
              <span className="font-mono text-xs text-white mt-1">
                {stripeAccountId ? `CONNECTED: ${stripeAccountId}` : 'NO PAYOUT ACCOUNT CONNECTED'}
              </span>
            </div>
            <button
              type="button"
              className="px-4 py-2 border border-white/20 hover:border-white font-mono text-[10px] tracking-[0.16em] uppercase transition-colors"
            >
              {stripeAccountId ? 'UPDATE STRIPE' : 'CONNECT PAYOUTS'}
            </button>
          </div>

          <div className="pt-6 border-t border-white/10 space-y-4">
            {saveError && (
              <div
                role="alert"
                data-testid="profile-save-error"
                className="border border-red-500/50 bg-red-500/10 px-4 py-3 font-mono text-[11px] tracking-[0.08em] text-red-300"
              >
                {saveError}
              </div>
            )}
            <div className="flex items-center justify-between">
              {justSaved ? (
                <span
                  role="status"
                  className="font-mono text-[10px] tracking-[0.2em] text-[#D2FF00] uppercase font-semibold"
                >
                  PROFILE SAVED
                </span>
              ) : (
                <div />
              )}
              <button
                type="submit"
                disabled={submitDisabled}
                aria-disabled={submitDisabled}
                title={guardianMissing ? 'A valid guardian email is required for athletes under 18.' : undefined}
                className="bg-white text-black font-mono text-[11px] uppercase tracking-[0.16em] px-8 py-3.5 rounded-full hover:bg-[#D2FF00] transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white inline-flex items-center gap-2"
              >
                {saving && (
                  <span
                    aria-hidden="true"
                    className="inline-block h-3 w-3 rounded-full border-2 border-black/30 border-t-black animate-spin"
                  />
                )}
                {saving ? 'SAVING...' : 'SAVE ATHLETE PROFILE ->'}
              </button>
            </div>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
};

export default AthleteProfileManager;
