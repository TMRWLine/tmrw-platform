import React from 'react';
import type { LandingSectionId } from './Navigation';
import { SovereignSyndicateBoard } from './SyndicateRunway';
import {
  emitRosterFilter,
  stashRosterFilter,
  type RosterCommercialTierId,
} from '../lib/overlayEvents';

interface FlightSpec {
  label: string;
  value: string;
}

interface FlightSettlement {
  athlete: string;
  club: string;
}

interface FlightTier {
  tier_id: RosterCommercialTierId;
  flight: string;
  badge: string;
  name: string;
  investment: string;
  cycle: string;
  narrative: string;
  specs: readonly FlightSpec[];
  settlement: FlightSettlement;
  cta: string;
}

const FLIGHTS: readonly FlightTier[] = [
  {
    tier_id: 'local_merchant',
    flight: '01',
    badge: '5KM PRECINCT LOCK',
    name: 'Precinct Contra & Micro',
    investment: '$750 AUD',
    cycle: 'QUARTERLY EXAMPLE',
    narrative:
      "Back an athlete close to home. A local café, gym or clinic could help cover the cost of training or supply gear they need.",
    specs: [
      { label: 'TERRITORY', value: '5KM POSTCODE COMPETITOR LOCK' },
      { label: 'ACTIVATION', value: '1X IN-VENUE SESSION + COUNTER QR PLAQUE' },
      { label: 'DELIVERABLES', value: '2X AI-CUT 9:16 REELS (WATERMARKED)' },
      { label: 'HANDLE SPONSORSHIP', value: 'API HANDLE LINKING (5KM PAID ADS)' },
    ],
    settlement: { athlete: '$525', club: '$112.50' },
    cta: 'Explore local sponsorship',
  },
  {
    tier_id: 'pathway_flight',
    flight: '02',
    badge: '15KM DISTRICT LOCK',
    name: 'Pathway Contender',
    investment: '$3500 AUD',
    cycle: 'ANNUAL EXAMPLE',
    narrative:
      'Help an emerging athlete cover a season of training and travel. Agree together on where and how the sponsorship shows up.',
    specs: [
      { label: 'TERRITORY', value: '15KM SUBURBAN CLUSTER EXCLUSIVITY' },
      { label: 'BRANDING', value: 'OFFICIAL TRAINING KIT LOGO PLACEMENT' },
      { label: 'ACTIVATION', value: '4X QUARTERLY 9:16 CONTENT DROPS + 1X APPEARANCE' },
      { label: 'HANDLE SPONSORSHIP', value: 'PAID SOCIAL AMPLIFICATION (15KM)' },
    ],
    settlement: { athlete: '$2450', club: '$525' },
    cta: 'Explore pathway sponsorship',
  },
  {
    tier_id: 'national_challenger',
    flight: '03',
    badge: 'CATEGORY EXCLUSIVITY',
    name: 'National Challenger',
    investment: '$12500 AUD',
    cycle: 'ANNUAL EXAMPLE',
    narrative:
      'Back an athlete competing nationally. Discuss campaign content, appearances and any agreed category exclusivity.',
    specs: [
      { label: 'TERRITORY', value: 'STATE-WIDE 48-SECTOR CATEGORY LOCK' },
      { label: 'MEDIA VAULT', value: 'PRE-SHOT 4K BROADCAST & 9:16 AD STEMS' },
      { label: 'APPEARANCES', value: '1X EXECUTIVE KEYNOTE OR CLINIC SESSION' },
      { label: 'HANDLE SPONSORSHIP', value: 'STATE-WIDE API HANDLE LINKING' },
    ],
    settlement: { athlete: '$8750', club: '$1875' },
    cta: 'Explore national sponsorship',
  },
  {
    tier_id: 'world_class',
    flight: '04',
    badge: 'AU & NZ LICENCE',
    name: 'Trans-Tasman Headline',
    investment: '$25000 AUD',
    cycle: 'HEADLINE PARTNERSHIP EXAMPLE',
    narrative:
      'Explore an athlete partnership across Australia and Aotearoa New Zealand. Discuss content, appearances and any use of the athlete’s name, image and likeness (NIL).',
    specs: [
      { label: 'TERRITORY', value: 'TRANS-TASMAN EXCLUSIVITY (AU & NZ)' },
      { label: 'COMMERCIAL', value: 'HEADLINE AMBASSADOR, IP & MERCH CAPSULE' },
      { label: 'KEYNOTE', value: 'INTERNAL STAFF TOWN HALL + VIP ACCESS' },
      { label: 'HANDLE SPONSORSHIP', value: 'AU & NZ PAID SOCIAL AMPLIFICATION' },
    ],
    settlement: { athlete: '$17500', club: '$3750' },
    cta: 'Explore trans-Tasman sponsorship',
  },
];

interface CommercialTiersProps {
  onNavigateSection?: (id: LandingSectionId) => void;
}

function ClearingProtocolBar({ athlete, club }: FlightSettlement) {
  return (
    <>
      <div className="flex justify-between text-[9px] font-mono font-bold uppercase text-neutral-400 mb-1">
        <span>ATHLETE 70% ({athlete})</span>
        <span>CLUB 15% ({club})</span>
        <span>PLATFORM 15%</span>
      </div>
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex mb-4">
        <div className="bg-white h-full w-[70%]"></div>
        <div className="bg-volt h-full w-[15%]"></div>
        <div className="bg-neutral-500 h-full w-[15%]"></div>
      </div>
    </>
  );
}

export const CommercialTiers: React.FC<CommercialTiersProps> = ({ onNavigateSection }) => {
  const selectFlight = (tier: FlightTier) => {
    stashRosterFilter(tier.tier_id, tier.name);
    emitRosterFilter(tier.tier_id, tier.name);
    if (onNavigateSection) {
      onNavigateSection('roster');
      return;
    }
    document.getElementById('roster')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openSyndicate = () => {
    if (onNavigateSection) {
      onNavigateSection('syndicate');
      return;
    }
    document.getElementById('syndicate')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section
      id="commercial-tiers"
      aria-labelledby="commercial-tiers-heading"
      className="relative w-full bg-[#0B0B0D] text-white scroll-mt-[74px]"
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 w-full pt-20 pb-16 bg-[#0B0B0D]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end pb-8 border-b border-white/10 mb-10">
          <div className="lg:col-span-7">
            <h2
              id="commercial-tiers-heading"
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight uppercase text-white leading-[0.98]"
            >
              FOUR WAYS TO BACK LOCAL SPORT<span className="text-volt">.</span>
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-sm md:text-base text-neutral-300 leading-relaxed font-sans">
              Followers don&apos;t pay rent. These examples show what local sponsorship could cover. The athlete and sponsor
              agree what the deal includes, and we check the applicable sport rules and permissions before anything goes ahead.
              A worked split is 70% to the athlete, 15% to their grassroots club and 15% to TMRWLine. Final terms and tax paperwork are agreed separately.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-8">
          {FLIGHTS.map((tier) => (
            <article
              key={tier.tier_id}
              className="bg-[#0F0F11] rounded-[24px] border border-white/10 p-6 flex flex-col justify-between hover:border-white/25 transition-all"
            >
              <div>
                <div className="flex justify-between items-center text-[10px] font-mono uppercase pb-3 border-b border-white/10">
                  <span className="text-neutral-300 font-mono font-bold">PACKAGE {tier.flight}</span>
                  <span className="bg-volt text-black font-bold px-2.5 py-0.5 rounded-full">{tier.badge}</span>
                </div>

                <h3 className="text-xl font-bold uppercase text-white mt-4">{tier.name}</h3>
                <div className="my-3">
                  <span className="text-3xl font-bold tracking-tighter text-white block">{tier.investment}</span>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block mt-0.5 font-medium">
                    {tier.cycle}
                  </span>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed font-sans min-h-[72px]">{tier.narrative}</p>

                <div className="space-y-2 py-4 my-2 border-y border-white/10 text-[10px] font-mono uppercase">
                  {tier.specs.map((spec) => (
                    <div key={spec.label} className="flex justify-between gap-3">
                      <span className="text-neutral-400 font-mono font-semibold">{spec.label}</span>
                      <span className="text-white font-bold text-right">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <ClearingProtocolBar athlete={tier.settlement.athlete} club={tier.settlement.club} />
                <button
                  type="button"
                  onClick={() => selectFlight(tier)}
                  className="w-full bg-transparent hover:bg-white/[0.04] text-white font-mono font-bold text-xs py-3.5 rounded-xl border border-white/10 hover:border-volt transition-all uppercase tracking-wider text-center cursor-pointer"
                >
                  {tier.cta}
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="w-full bg-[#0F0F11] text-white rounded-[28px] p-8 md:p-12 border border-white/10">
          <div className="flex flex-wrap justify-between items-center gap-4 pb-6 border-b border-white/10 mb-8">
            <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
              MULTI-ATHLETE ENTERPRISE PORTFOLIO · LA 2028 &amp; BRISBANE 2032 RUNWAY
            </span>
            <span className="bg-volt text-[#0F0F11] font-mono font-bold text-xs px-3.5 py-1 rounded-full uppercase tracking-wider">
              EXAMPLE PORTFOLIO · SUBJECT TO AGREEMENT
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight uppercase text-white leading-[1.02]">
                OLYMPIC &amp; PARALYMPIC CORPORATE SYNDICATE
              </h3>
              <div>
                <span className="text-4xl sm:text-5xl font-bold tracking-tighter text-volt block">$50000+ AUD</span>
                <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest mt-1 block font-medium">
                  EXAMPLE ANNUAL PORTFOLIO
                </span>
              </div>
              <p className="text-sm text-neutral-300 leading-relaxed font-sans max-w-2xl">
                Explore backing for athletes and grassroots clubs on the road to LA 2028 and Brisbane 2032. Agree the athletes, deliverables and reporting before you commit. Any campaign content and paid social use need permission and review against applicable rules, including Rule 40 where relevant.
              </p>
            </div>

            <div className="lg:col-span-5 flex flex-col justify-between space-y-6 bg-white/[0.04] p-6 rounded-2xl border border-white/10">
              <div className="space-y-3 font-mono text-xs uppercase text-neutral-300">
                <div className="flex justify-between pb-2 border-b border-white/10">
                  <span className="text-neutral-400">PORTFOLIO</span>
                  <span className="font-bold text-white text-right">EXAMPLE: FIVE ATHLETES AND THEIR CLUBS</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-white/10">
                  <span className="text-neutral-400">PROCUREMENT</span>
                  <span className="font-bold text-white text-right">CONFIRM PAPERWORK BEFORE COMMITTING</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-white/10">
                  <span className="text-neutral-400">HANDLE SPONSORSHIP</span>
                  <span className="font-bold text-white text-right">PAID SOCIAL USE BY AGREEMENT</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-white/10">
                  <span className="text-neutral-400">GOVERNANCE</span>
                  <span className="font-bold text-volt text-right">SPORTING RULES AND PERMISSIONS REVIEW</span>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex justify-between text-[9px] font-mono font-bold uppercase text-white mb-1">
                  <span>ATHLETES 70% ($35000)</span>
                  <span>CLUBS 15% ($7500)</span>
                  <span>PLATFORM 15%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex mb-6">
                  <div className="bg-white h-full w-[70%]"></div>
                  <div className="bg-volt h-full w-[15%]"></div>
                  <div className="bg-neutral-500 h-full w-[15%]"></div>
                </div>
                <button
                  type="button"
                  onClick={openSyndicate}
                  className="w-full bg-volt hover:bg-volt text-[#0F0F11] font-mono font-bold text-xs py-4 px-6 rounded-xl transition-all uppercase tracking-wider text-center cursor-pointer shadow-xl"
                >
                  APPLY FOR $50K SYNDICATE ALLOCATION →
                </button>
              </div>
            </div>
          </div>
        </div>

        <div data-sovereign-board id="syndicate" className="mt-6 border-t border-white/10 pt-4">
          <SovereignSyndicateBoard embedded />
        </div>
      </div>
    </section>
  );
};

export default CommercialTiers;