import React, { useEffect, useId, useState } from 'react';
import { BrandLockup } from './BrandLockup';

export type PortalLeague = 'NBL1' | 'SHUTE SHIELD' | 'VFL';
export type PortalMode = 'authenticate' | 'claim';

/** Typed hand-off from the drawer. `league` / `postcode` are only populated when claiming a profile. */
interface PortalSubmission {
  mode: PortalMode;
  /** Digits only (AU mobile without the +61 prefix, or numeric athlete ID). */
  identifier: string;
  league: PortalLeague | null;
  /** Four-digit AU postcode. */
  postcode: string | null;
}

interface AthletePortalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Continues into the secure athlete sign-in / account creation modal. */
  onContinue: (submission: PortalSubmission) => void;
  /** Optional instant sandbox bypass for local testing. */
  onTestBypass?: (sandboxAthlete: any) => void;
}

const LEAGUES: ReadonlyArray<PortalLeague> = ['NBL1', 'SHUTE SHIELD', 'VFL'];

const MODE_TABS: ReadonlyArray<{ mode: PortalMode; label: string }> = [
  { mode: 'authenticate', label: 'AUTHENTICATE' },
  { mode: 'claim', label: 'CLAIM PROFILE' },
];

const FIELD_LABEL = 'font-mono text-[9px] tracking-[0.2em] text-[#555555] uppercase block mb-2 font-bold';
const FIELD_SHELL =
  'bg-[#FFFFFF] border border-black/15 rounded-xl px-4 py-3 text-sm font-mono text-[#080808] placeholder-[#888888] outline-none focus-within:border-[#080808] transition-colors w-full flex items-center shadow-sm';
const FIELD_INPUT =
  'bg-transparent text-sm font-mono text-[#080808] placeholder-[#888888] outline-none w-full select-text border-0 p-0';

const PROTOCOL_ROWS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Identity Validation', value: 'Passport / NBL1' },
  { label: 'Escrow Settlement', value: 'T+0 Disbursement' },
  { label: 'Catchment Exclusivity', value: 'Postcode Locked' },
];

const CloseIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const AthletePortalDrawer: React.FC<AthletePortalDrawerProps> = ({
  isOpen,
  onClose,
  onContinue,
  onTestBypass,
}) => {
  const baseId = useId();
  const identifierId = `${baseId}-identifier`;
  const leagueId = `${baseId}-league`;
  const postcodeId = `${baseId}-postcode`;
  const panelId = `${baseId}-panel`;

  const [mode, setMode] = useState<PortalMode>('authenticate');
  const [identifier, setIdentifier] = useState('');
  const [league, setLeague] = useState<PortalLeague | ''>('');
  const [postcode, setPostcode] = useState('');

  const isClaim = mode === 'claim';
  const canSubmit = !isClaim || (league !== '' && /^\d{4}$/.test(postcode));

  useEffect(() => {
    if (isOpen) return;
    setMode('authenticate');
    setIdentifier('');
    setLeague('');
    setPostcode('');
  }, [isOpen]);

  const submit = () => {
    if (!canSubmit) return;
    onContinue({
      mode,
      identifier,
      league: isClaim && league !== '' ? league : null,
      postcode: isClaim ? postcode : null,
    });
  };

  const handleTestBypass = () => {
    const sandboxAthlete = {
      id: 'athlete_marcus_thorne',
      full_name: 'Marcus Thorne',
      display_name: 'Marcus Thorne',
      sport: 'Basketball',
      league: 'NBL1 East',
      current_club: 'Bankstown Bruins',
      postcode: '2200',
      status: 'Verified',
      agreement_status: 'cleared',
    };
    if (onTestBypass) {
      onTestBypass(sandboxAthlete);
    } else {
      onContinue({
        mode: 'authenticate',
        identifier: '0400000000',
        league: null,
        postcode: null,
      });
    }
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 selection:bg-[#CCFF00] selection:text-[#080808]">
      <button
        type="button"
        aria-label="Close athlete portal"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn border-0 p-0 cursor-default"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Athlete portal"
        className="absolute top-0 right-0 h-full w-full max-w-[480px] bg-[#FFFFFF] border-l border-black/10 z-10 p-8 md:p-12 flex flex-col justify-between shadow-2xl animate-slideInRight select-none overflow-y-auto"
      >
        <div>
          {/* Header row */}
          <div className="flex items-center justify-between border-b border-black/10 pb-6">
            <BrandLockup onClick={onClose} />

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex items-center justify-center p-1.5 text-neutral-500 hover:text-[#080808] transition-colors duration-150 cursor-pointer bg-transparent border-0 rounded-full hover:bg-neutral-100"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Mode switch: Pangram daylight capsule */}
          <div
            role="tablist"
            aria-label="Portal access mode"
            className="grid grid-cols-2 p-1 bg-[#EAEAE6] rounded-full my-8 border border-black/10"
          >
            {MODE_TABS.map((tab) => {
              const active = tab.mode === mode;
              return (
                <button
                  key={tab.mode}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${tab.mode}`}
                  aria-selected={active}
                  aria-controls={panelId}
                  onClick={() => setMode(tab.mode)}
                  className={`py-2.5 text-[10px] font-mono font-bold tracking-[0.2em] uppercase rounded-full transition-all duration-200 cursor-pointer border-0 ${
                    active
                      ? 'bg-[#080808] text-[#CCFF00] shadow-sm'
                      : 'bg-transparent text-neutral-600 hover:text-[#080808]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Instant Sandbox Test Bypass Box */}
          <div className="mb-8 rounded-[18px] bg-[#080808] text-white p-5 space-y-3 border border-black/15 shadow-md">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#CCFF00] block">
              // LOCAL TESTING BYPASS
            </span>
            <p className="m-0 font-sans text-xs text-neutral-300 leading-relaxed">
              Skip mobile verification right now and enter the operator console immediately as Marcus Thorne (Postcode 2200).
            </p>
            <button
              type="button"
              onClick={handleTestBypass}
              className="w-full rounded-full bg-[#CCFF00] hover:bg-white text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest py-3 border-0 cursor-pointer transition-colors shadow-sm font-bold"
            >
              ⚡ Bypass Login (Test Portal Now) →
            </button>
          </div>

          {/* Content */}
          <span className="font-mono text-[10px] tracking-[0.24em] text-neutral-400 uppercase block mb-2">
            SOVEREIGN CLEARINGHOUSE
          </span>

          <h2 className="font-display font-black text-4xl uppercase tracking-[-0.03em] text-[#080808] leading-tight mb-3">
            Your career.<br />Your terms<span className="text-[#CCFF00]">.</span>
          </h2>

          <p className="font-sans text-xs text-neutral-600 leading-relaxed mb-8">
            No predatory management cuts. Log in with your mobile number to review brand partnerships, verify your junior club, and receive automated bank transfers the second deliverables are cleared.
          </p>

          {/* Dynamic input terminal */}
          <div
            role="tabpanel"
            id={panelId}
            aria-labelledby={`${baseId}-tab-${mode}`}
            className="w-full space-y-5 mb-8"
          >
            <div className="w-full">
              <label htmlFor={identifierId} className={FIELD_LABEL}>
                Mobile Number or Athlete ID
              </label>
              <div className={FIELD_SHELL}>
                <input
                  id={identifierId}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={16}
                  placeholder="+61 400 000 000"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value.replace(/[^\d+\s]/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submit();
                  }}
                  className={FIELD_INPUT}
                />
              </div>
            </div>

            {isClaim && (
              <>
                <div className="w-full">
                  <label htmlFor={leagueId} className={FIELD_LABEL}>
                    Select League (NBL1 / Shute Shield / VFL)
                  </label>
                  <div className={`${FIELD_SHELL} relative`}>
                    <select
                      id={leagueId}
                      value={league}
                      onChange={(e) => setLeague(e.target.value as PortalLeague | '')}
                      className={`${FIELD_INPUT} appearance-none cursor-pointer pr-6 ${
                        league === '' ? 'text-neutral-400' : ''
                      }`}
                      style={{ colorScheme: 'light' }}
                    >
                      <option value="" disabled>
                        SELECT LEAGUE
                      </option>
                      {LEAGUES.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <svg
                      viewBox="0 0 24 24"
                      className="pointer-events-none absolute right-4 w-4 h-4 text-neutral-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </div>

                <div className="w-full">
                  <label htmlFor={postcodeId} className={FIELD_LABEL}>
                    Postcode Catchment
                  </label>
                  <div className={FIELD_SHELL}>
                    <input
                      id={postcodeId}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{4}"
                      autoComplete="postal-code"
                      maxLength={4}
                      placeholder="2000"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submit();
                      }}
                      className={FIELD_INPUT}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Protocol specs table */}
          <div className="border-t border-b border-black/10 py-5 space-y-3.5 mb-8">
            {PROTOCOL_ROWS.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 font-mono text-[10px]">
                <span className="text-neutral-500 uppercase tracking-wider">{row.label}</span>
                <span className="text-[#080808] font-bold text-right">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom action & settlement cluster */}
        <div>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="w-full rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] font-mono font-bold text-xs uppercase tracking-widest py-4 transition-colors duration-200 cursor-pointer shadow-md border-0 disabled:opacity-40 disabled:cursor-not-allowed mb-6"
          >
            Request Login Code →
          </button>

          <div className="flex items-center justify-center text-[9px] font-mono text-neutral-500">
            <span className="tracking-widest uppercase text-center leading-relaxed">
              Stripe Connect Escrow · Sport Integrity Australia Aligned · Automated ATO Tax Invoicing
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default AthletePortalDrawer;