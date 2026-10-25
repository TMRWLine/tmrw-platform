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
    cycle: 'QUARTERLY ALLOCATION ($525 NET TO ATHLETE)',
    narrative:
      "Own your immediate postcode. Built for local cafes, gyms, and recovery clinics backing an athlete's daily training block through cash and product seeding. Lock out direct local competitors within a 5km radius.",
    specs: [
      { label: 'TERRITORY', value: '5KM POSTCODE LOCK' },
      { label: 'ACTIVATION', value: '1X IN-VENUE SESSION + PRODUCT SEEDING' },
      { label: 'DELIVERABLES', value: '2X GEO-VERIFIED SOCIAL TAGS' },
      { label: 'CLEARING RAIL', value: 'PROOF-OF-WORK ESCROW + INSTANT RCTI' },
    ],
    settlement: { athlete: '$525', club: '$112.50' },
    cta: 'LOCK FLIGHT 01 RIGHTS',
  },
  {
    tier_id: 'pathway_flight',
    flight: '02',
    badge: '15KM DISTRICT LOCK',
    name: 'Pathway Contender',
    investment: '$3500 AUD',
    cycle: 'ANNUAL FLIGHT ($2450 NET TO ATHLETE)',
    narrative:
      'Mid-market corporate backing for 18-to-25 contenders dominating elite state leagues (NBL1, Shute Shield, VFL, WNBL). Underwrites competition travel while putting your brand on training kit and verified local feeds.',
    specs: [
      { label: 'TERRITORY', value: '15KM SUBURBAN CLUSTER' },
      { label: 'BRANDING', value: 'OFFICIAL TRAINING KIT PLACEMENT' },
      { label: 'ACTIVATION', value: '4X QUARTERLY CONTENT SUITES' },
      { label: 'APPEARANCES', value: '1X IN-PERSON CORPORATE SESSION' },
    ],
    settlement: { athlete: '$2450', club: '$525' },
    cta: 'LOCK FLIGHT 02 RIGHTS',
  },
  {
    tier_id: 'national_challenger',
    flight: '03',
    badge: 'CATEGORY EXCLUSIVITY',
    name: 'National Challenger',
    investment: '$12500 AUD',
    cycle: 'ANNUAL FLIGHT ($8750 NET TO ATHLETE)',
    narrative:
      'Complete category lockout for national Olympic and Paralympic challengers on the LA 2028 and Brisbane 2032 runway. High-performance funding paired with broadcast-cleared media assets and executive keynotes.',
    specs: [
      { label: 'TERRITORY', value: 'STATE-WIDE CATEGORY LOCK' },
      { label: 'EXCLUSIVITY', value: '48-CODE COMPETITOR LOCKOUT' },
      { label: 'MEDIA RIGHTS', value: 'BROADCAST-CLEARED CAMPAIGN ASSETS' },
      { label: 'APPEARANCES', value: '1X EXECUTIVE KEYNOTE SESSION' },
    ],
    settlement: { athlete: '$8750', club: '$1875' },
    cta: 'LOCK FLIGHT 03 RIGHTS',
  },
  {
    tier_id: 'world_class',
    flight: '04',
    badge: 'PAN-PACIFIC RIGHTS',
    name: 'World-Class Benchmark',
    investment: '$25000 AUD',
    cycle: 'CAMPAIGN FLIGHT ($17500 NET TO ATHLETE)',
    narrative:
      'Enterprise association with world championship, Olympic, and Paralympic podium contenders. Full Pan-Pacific digital licensing, staff town hall keynotes, and Rule 40 pre-cleared ambassador campaigns across AU & NZ.',
    specs: [
      { label: 'TERRITORY', value: 'PAN-PACIFIC LICENCE (AU & NZ)' },
      { label: 'KEYNOTE', value: 'INTERNAL STAFF TOWN HALL' },
      { label: 'COMMERCIAL', value: 'FULL AMBASSADOR & IP RIGHTS' },
      { label: 'COMPLIANCE', value: 'RULE 40, TPA & SIA CLEARED' },
    ],
    settlement: { athlete: '$17500', club: '$3750' },
    cta: 'LOCK FLIGHT 04 RIGHTS',
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
        <div className="bg-[#CCFF00] h-full w-[15%]"></div>
        <div className="bg-neutral-500 h-full w-[15%]"></div>
      </div>
    </>
  );
}

/**
 * Section five. One nocturnal broadsheet: four commercial flights, the $50000 National
 * Syndicate, then the $250000 Sovereign Syndicate master block.
 */
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
              FOUR CLEAN FLIGHTS. ZERO TALENT AGENCY COMMISSIONS<span className="text-[#CCFF00]">.</span>
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-sm md:text-base text-neutral-300 leading-relaxed font-sans">
              Standardised commercial flight agreements engineered for the Olympic and Paralympic runway to LA 2028 and
              Brisbane 2032. Every deal is pre-cleared across 48 sporting codes for governing body TPA compliance,
              locked in automated Stripe Connect escrow, and settled instantly via 100% tax-deductible ATO Recipient
              Created Tax Invoices (RCTIs). Real local ROI for brands. Direct 70/15/15 cash flow for contenders and the
              grassroots clubs that built them.
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
                  <span className="text-neutral-300 font-mono font-bold">FLIGHT {tier.flight}</span>
                  <span className="bg-[#CCFF00] text-black font-bold px-2.5 py-0.5 rounded-full">{tier.badge}</span>
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
                  className="w-full bg-transparent hover:bg-white/[0.04] text-white font-mono font-bold text-xs py-3.5 rounded-xl border border-white/10 hover:border-[#CCFF00] transition-all uppercase tracking-wider text-center cursor-pointer"
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
              ENTERPRISE FLAGSHIP · BY CORPORATE APPLICATION ONLY
            </span>
            <span className="bg-[#CCFF00] text-[#0F0F11] font-mono font-bold text-xs px-3.5 py-1 rounded-full uppercase tracking-wider">
              LA 2028 & BRISBANE 2032 RUNWAY
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight uppercase text-white leading-[1.02]">
                OLYMPIC & PARALYMPIC CORPORATE SYNDICATE
              </h3>
              <div>
                <span className="text-4xl sm:text-5xl font-bold tracking-tighter text-[#CCFF00] block">$50000+ AUD</span>
                <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest mt-1 block font-medium">
                  ANNUAL PORTFOLIO ($35000 TO ATHLETES · $7500 TO GRASSROOTS CLUBS)
                </span>
              </div>
              <p className="text-sm text-neutral-300 leading-relaxed font-sans max-w-2xl">
                Engineered for national enterprises deploying brand, ESG, and disability inclusion capital ahead of LA
                2028 and Brisbane 2032. Simultaneously underwrite five Olympic and Paralympic hopefuls and five
                grassroots junior clubs on a single ATO-compliant RCTI tax invoice, complete with quarterly board-ready
                ESG and social impact reporting.
              </p>
            </div>

            <div className="lg:col-span-5 flex flex-col justify-between space-y-6 bg-white/[0.04] p-6 rounded-2xl border border-white/10">
              <div className="space-y-3 font-mono text-xs uppercase text-neutral-300">
                <div className="flex justify-between pb-2 border-b border-white/10">
                  <span className="text-neutral-400">PORTFOLIO</span>
                  <span className="font-bold text-white text-right">5X OLYMPIC & PARALYMPIC CONTENDERS + 5X CLUBS</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-white/10">
                  <span className="text-neutral-400">EXCLUSIVITY</span>
                  <span className="font-bold text-white text-right">MULTI-CATEGORY NATIONAL LOCKOUT</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-white/10">
                  <span className="text-neutral-400">DELIVERABLES</span>
                  <span className="font-bold text-white text-right">NATIONAL CAMPAIGN RIGHTS & BOARD KEYNOTES</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-white/10">
                  <span className="text-neutral-400">GOVERNANCE</span>
                  <span className="font-bold text-[#CCFF00] text-right">AUDITED ESG, DEI & SPORT INTEGRITY REPORTING</span>
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
                  <div className="bg-[#CCFF00] h-full w-[15%]"></div>
                  <div className="bg-neutral-500 h-full w-[15%]"></div>
                </div>
                <button
                  type="button"
                  onClick={openSyndicate}
                  className="w-full bg-[#CCFF00] hover:bg-[#b8e600] text-[#0F0F11] font-mono font-bold text-xs py-4 px-6 rounded-xl transition-all uppercase tracking-wider text-center cursor-pointer shadow-xl"
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
