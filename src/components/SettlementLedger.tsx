import React from 'react';
import { AssetImage } from './AssetImage';
import { FilmGrainOverlay } from './FilmGrainOverlay';

const GROSS = '$2500 AUD';
const ATHLETE = '$1750 AUD';
const CLUB = '$375 AUD';
const ESCROW = '$375 AUD';

export const SettlementLedger: React.FC = () => (
  <section
    id="settlement-ledger"
    aria-labelledby="ledger-heading"
    className="w-full bg-[#FFFFFF] scroll-mt-[74px]"
  >
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 w-full my-20 bg-[#FFFFFF]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end pb-8 mb-8">
        <div className="lg:col-span-7 min-w-0">
          <h2
            id="ledger-heading"
            className="m-0 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight uppercase text-neutral-900 leading-[0.98]"
          >
            ONE CONTRACT. ONE INVOICE. SETTLED BEFORE THE STARTING SIREN
            <span className="text-[#CCFF00]">.</span>
          </h2>
        </div>
        <div className="lg:col-span-5 min-w-0">
          <p className="m-0 text-sm md:text-base text-neutral-600 leading-relaxed font-sans">
            A deterministic commercial split cleared through automated escrow. Zero talent agency
            commissions, zero payment chasing, and zero out-of-pocket athletes. Commercial backing
            lands directly in the contender&apos;s account before competition begins, with audited
            tax receipts generated automatically.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch w-full">
        <div className="lg:col-span-6 rounded-[24px] overflow-hidden relative min-h-[640px] bg-neutral-950 shadow-xl flex flex-col justify-between p-6 sm:p-8">
          <AssetImage
            file="surfer.jpg"
            alt="Hunter Clark surfing a barrel at North Narrabeen"
            fallbackLabel="Hunter Clark · North Narrabeen"
            className="absolute inset-0 h-full w-full object-cover contrast-125 saturate-[1.12]"
            objectPosition="center 35%"
            loading="eager"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/15 pointer-events-none"
          />
          <FilmGrainOverlay intensity="fine" />

          <div className="relative z-10 flex items-center justify-between">
            <span className="bg-[#CCFF00] text-black font-mono font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
              CASE SPECIMEN · SURFING
            </span>
            <span className="font-mono text-[10px] text-white/90 uppercase tracking-widest bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              NORTH NARRABEEN · NSW
            </span>
          </div>

          <div className="relative z-10 text-white">
            <span className="text-3xl sm:text-4xl font-bold uppercase tracking-tight block text-white drop-shadow-md">
              HUNTER CLARK
            </span>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs font-mono uppercase tracking-wider text-neutral-200 drop-shadow-sm">
              <span>WSL QUALIFYING SERIES</span>
              <span>·</span>
              <span className="text-[#CCFF00] font-bold">8KM RADIAL LOCK · BROOKVALE</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 flex flex-col justify-between py-2 px-1">
          <div className="flex justify-between items-center border-b-2 border-neutral-900 pb-4 mb-4">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900">
              RCTI · RECIPIENT CREATED TAX INVOICE
            </span>
            <span className="bg-[#0F0F11] text-[#CCFF00] font-mono font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
              SETTLED IN ESCROW
            </span>
          </div>

          <div className="grid grid-cols-2 gap-6 py-4 border-b border-neutral-200 font-mono text-xs uppercase">
            <div>
              <span className="text-neutral-400 text-[10px] block mb-0.5">COMMERCIAL BACKER</span>
              <span className="font-bold text-neutral-950 block">Peninsula Motor Group</span>
              <span className="text-neutral-500 text-[10px] block">Brookvale NSW · Postcode 2100</span>
            </div>
            <div>
              <span className="text-neutral-400 text-[10px] block mb-0.5">VERIFIED CONTENDER</span>
              <span className="font-bold text-neutral-950 block">Hunter Clark</span>
              <span className="text-neutral-500 text-[10px] block">North Narrabeen NSW · Postcode 2101</span>
            </div>
          </div>

          <div className="w-full space-y-3 py-4 border-b border-neutral-200 font-mono text-xs uppercase">
            <div className="flex justify-between items-baseline text-neutral-500">
              <span>GROSS COMMERCIAL RETAINER</span>
              <span className="text-neutral-950 font-bold text-base">{GROSS}</span>
            </div>

            <div className="flex justify-between items-center text-neutral-950 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
              <div>
                <span className="font-bold block">CONTENDER DIRECT PAYOUT (70%)</span>
                <span className="text-[10px] text-neutral-500">Direct Stripe Connect transfer</span>
              </div>
              <span className="font-bold text-xl text-neutral-950">{ATHLETE}</span>
            </div>

            <div className="flex justify-between items-center text-neutral-700 px-1">
              <div>
                <span className="block font-medium">GRASSROOTS CLUB DIVIDEND (15%)</span>
                <span className="text-[10px] text-neutral-400">North Narrabeen Boardriders Club</span>
              </div>
              <span className="font-semibold text-neutral-950">{CLUB}</span>
            </div>

            <div className="flex justify-between items-center text-neutral-700 px-1">
              <div>
                <span className="block font-medium">PLATFORM OPERATIONS &amp; ESCROW (15%)</span>
                <span className="text-[10px] text-neutral-400">Sport Integrity verification &amp; clearing</span>
              </div>
              <span className="font-semibold text-neutral-950">{ESCROW}</span>
            </div>
          </div>

          <div className="space-y-2 py-4 border-b border-neutral-200 text-[11px] font-mono uppercase text-neutral-500">
            <div className="flex justify-between">
              <span>ESCROW DEPOSIT</span>
              <span className="text-neutral-900 font-medium">CLEARED VIA INSTITUTIONAL VAULT</span>
            </div>
            <div className="flex justify-between">
              <span>INTEGRITY CLEARANCE</span>
              <span className="text-neutral-900 font-medium">SPORT INTEGRITY AUSTRALIA BYLAW VERIFIED</span>
            </div>
            <div className="flex justify-between">
              <span>PRE-SIREN DISBURSEMENT</span>
              <span className="text-neutral-900 font-medium">70% RELEASED PRIOR TO HEAT ONE</span>
            </div>
            <div className="flex justify-between">
              <span>TAX INVOICE ISSUED</span>
              <span className="text-neutral-900 font-medium">ATO &amp; NZ IRD COMPLIANT RCTI</span>
            </div>
          </div>

          <button
            type="button"
            className="w-full bg-[#0F0F11] hover:bg-neutral-800 text-white font-mono font-bold text-xs py-4 px-6 rounded-xl transition-all uppercase tracking-wider text-center cursor-pointer mt-4 block shadow-md"
          >
            INSPECT AUDITED CLEARING RECEIPT →
          </button>
        </div>
      </div>
    </div>
  </section>
);

export default SettlementLedger;
