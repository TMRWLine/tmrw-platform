import React, { useEffect, useId, useState } from 'react';
import { BrandLockup } from './BrandLockup';
import { dispatchOpenCapsuleDrawer } from './CartDrawer';

export type PortalLeague = 'NBL1' | 'SHUTE SHIELD' | 'VFL';
export type PortalMode = 'authenticate' | 'claim';

interface PortalSubmission {
  mode: PortalMode;
  identifier: string;
  league: PortalLeague | null;
  postcode: string | null;
}

interface AthletePortalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: (submission: PortalSubmission) => void;
  onTestBypass?: (sandboxAthlete: any) => void;
}

const LEAGUES: ReadonlyArray<PortalLeague> = ['NBL1', 'SHUTE SHIELD', 'VFL'];

const MODE_TABS: ReadonlyArray<{ mode: PortalMode; label: string }> = [
  { mode: 'authenticate', label: 'SIGN IN' },
  { mode: 'claim', label: 'CLAIM PROFILE' },
];

const FIELD_LABEL = 'font-mono text-[9.5px] tracking-[0.18em] text-neutral-500 uppercase block mb-2 font-bold';
const FIELD_SHELL =
  'bg-[#EAEAE6] border border-black/10 rounded-xl px-4 py-3.5 text-sm font-mono text-[#0F0F11] placeholder-neutral-400 outline-none focus-within:border-[#0F0F11] transition-colors w-full flex items-center';
const FIELD_INPUT =
  'bg-transparent text-sm font-mono font-bold text-[#0F0F11] placeholder-neutral-400 outline-none w-full select-text border-0 p-0';

const PROTOCOL_ROWS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'League Clearance', value: 'SIA & Federation Verified' },
  { label: 'Clearing Split', value: '70% Athlete · 15% Club · 15% Ops' },
  { label: 'Handle Sponsorship', value: 'Meta & TikTok OAuth Ready' },
];

export const AthletePortalDrawer: React.FC<AthletePortalDrawerProps> = ({
  isOpen,
  onClose,
  onContinue,
}) => {
  const baseId = useId();
  const identifierId = `${baseId}-identifier`;
  const leagueId = `${baseId}-league`;
  const postcodeId = `${baseId}-postcode`;
  const panelId = `${baseId}-panel`;

  const [mode, setMode] = useState<PortalMode>('authenticate');
  const [identifier, setIdentifier] = useState('+61 400 892 104');
  const [league, setLeague] = useState<PortalLeague>('NBL1');
  const [postcode, setPostcode] = useState('2200');

  const isClaim = mode === 'claim';

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const triggerHandOff = (targetMode: PortalMode) => {
    onContinue({
      mode: targetMode,
      identifier: identifier || '0400892104',
      league: targetMode === 'claim' ? league : null,
      postcode: targetMode === 'claim' ? postcode : null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 selection:bg-[#CCFF00] selection:text-[#0F0F11]">
      <button
        type="button"
        aria-label="Close athlete portal"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn border-0 p-0 cursor-default"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Athlete portal"
        className="absolute top-0 right-0 h-full w-full max-w-[500px] bg-[#FFFFFF] border-l border-black/10 z-10 p-8 md:p-10 flex flex-col justify-between shadow-2xl animate-slideInRight select-none overflow-y-auto"
      >
        <div>
          {/* Header row */}
          <div className="flex items-center justify-between border-b border-black/10 pb-5">
            <BrandLockup onClick={onClose} />
            <button
              type="button"
              onClick={onClose}
              title="Close [ESC]"
              aria-label="Close portal"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0F0F11] hover:bg-white text-white hover:text-[#0F0F11] border border-transparent hover:border-black/25 px-5 py-1.5 font-sans text-xs font-bold tracking-tight shadow-sm transition-all duration-300 cursor-pointer group"
            >
              <span>Close</span>
              <span className="text-[11px] text-[#CCFF00] group-hover:text-[#0F0F11] transition-colors">✕</span>
            </button>
          </div>

          {/* Mode switch */}
          <div
            role="tablist"
            aria-label="Portal access mode"
            className="grid grid-cols-2 p-1 bg-[#EAEAE6] rounded-full my-6 border border-black/10"
          >
            {MODE_TABS.map((tab) => {
              const active = tab.mode === mode;
              return (
                <button
                  key={tab.mode}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setMode(tab.mode)}
                  className={`py-2.5 text-[10px] font-mono font-bold tracking-[0.18em] uppercase rounded-full transition-all duration-200 cursor-pointer border-0 ${
                    active
                      ? 'bg-[#0F0F11] text-[#CCFF00] shadow-sm'
                      : 'bg-transparent text-neutral-600 hover:text-[#0F0F11]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Bento Hero Card inside Drawer */}
          <div className="mb-6 rounded-[24px] bg-[#0F0F11] text-white p-7 space-y-4 shadow-xl">
            <h2 className="m-0 font-sans font-black text-3xl sm:text-4xl uppercase tracking-[-0.03em] text-white leading-[1.02]">
              Your career<span className="text-[#CCFF00]">.</span>
              <br />
              Your terms<span className="text-[#CCFF00]">.</span>
            </h2>
            <p className="m-0 font-sans text-xs text-neutral-300 leading-relaxed">
              Zero agency commissions. Lock your postcode, back your junior club with a hardwired{' '}
              <span className="bg-[#CCFF00] text-[#0F0F11] font-bold px-1.5 py-0.5 rounded-[3px]">
                70/15/15 split
              </span>
              , and link your social handles in 60 seconds.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => triggerHandOff('claim')}
                className="w-full rounded-full bg-[#CCFF00] hover:bg-white text-[#0F0F11] font-mono text-[10px] font-bold uppercase tracking-widest py-3 border-0 cursor-pointer transition-colors shadow-sm"
              >
                Bypass → Test 4-Step Account Creation
              </button>
            </div>
          </div>

          {/* Dynamic input terminal */}
          <div role="tabpanel" id={panelId} className="w-full space-y-4 mb-6">
            <div className="w-full">
              <label htmlFor={identifierId} className={FIELD_LABEL}>
                Verified Mobile Number or League ID
              </label>
              <div className={FIELD_SHELL}>
                <input
                  id={identifierId}
                  type="tel"
                  inputMode="tel"
                  maxLength={16}
                  placeholder="+61 400 892 104"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className={FIELD_INPUT}
                />
              </div>
            </div>

            {isClaim && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={leagueId} className={FIELD_LABEL}>
                    Televised League
                  </label>
                  <div className={FIELD_SHELL}>
                    <select
                      id={leagueId}
                      value={league}
                      onChange={(e) => setLeague(e.target.value as PortalLeague)}
                      className={`${FIELD_INPUT} cursor-pointer`}
                    >
                      {LEAGUES.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor={postcodeId} className={FIELD_LABEL}>
                    Home Postcode
                  </label>
                  <div className={FIELD_SHELL}>
                    <input
                      id={postcodeId}
                      type="text"
                      maxLength={4}
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className={FIELD_INPUT}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Zero-Inventory Merch Capsule Studio Launcher Card */}
          <div className="mb-6 rounded-2xl bg-[#EAEAE6] border border-black/10 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9.5px] font-bold uppercase tracking-widest text-neutral-600">
                ATHLETE COMMERCE STUDIO
              </span>
              <span className="rounded-full bg-[#0F0F11] text-[#CCFF00] px-2 py-0.5 font-mono text-[9px] font-bold">
                ZERO-INVENTORY
              </span>
            </div>
            <h4 className="m-0 font-sans text-sm font-black uppercase text-[#0F0F11]">
              Publish Co-Branded Streetwear
            </h4>
            <p className="m-0 font-sans text-xs text-neutral-600 leading-relaxed">
              Launch a 72-hour pre-order capsule. 70% net revenue goes to you, 15% to your junior club.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                dispatchOpenCapsuleDrawer({
                  initialView: 'creator',
                  athleteName: 'Marcus Thorne',
                  clubName: 'Bankstown Bruins',
                  postcode: postcode || '2200',
                });
              }}
              className="w-full rounded-full bg-[#0F0F11] hover:bg-[#CCFF00] text-white hover:text-[#0F0F11] font-mono text-[10px] font-bold uppercase tracking-widest py-3 transition-colors cursor-pointer border-0 shadow-xs"
            >
              + Launch Merch Capsule Studio →
            </button>
          </div>

          {/* Protocol specs table */}
          <div className="border-t border-b border-black/10 py-4 space-y-2.5 mb-6">
            {PROTOCOL_ROWS.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 font-mono text-[10px]">
                <span className="text-neutral-500 uppercase tracking-wider">{row.label}</span>
                <span className="text-[#0F0F11] font-bold text-right">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div>
          <button
            type="button"
            onClick={() => triggerHandOff(mode)}
            className="w-full rounded-full bg-[#0F0F11] hover:bg-[#CCFF00] text-white hover:text-[#0F0F11] font-mono font-bold text-xs uppercase tracking-widest py-4 transition-colors duration-200 cursor-pointer shadow-md border-0"
          >
            {isClaim ? 'Continue to Account Creation →' : 'Open Athlete Terminal →'}
          </button>
        </div>
      </aside>
    </div>
  );
};

export default AthletePortalDrawer;