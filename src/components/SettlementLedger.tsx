import React, { useState, useRef } from 'react';
import { FilmGrainOverlay } from './FilmGrainOverlay';

const GROSS = '$2500 AUD';
const ATHLETE = '$1750 AUD';
const CLUB = '$375 AUD';
const ESCROW = '$375 AUD';

export const SettlementLedger: React.FC = () => {
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Seamless loop cutoff before logo appears
  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.currentTime >= 7.8) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <section
      id="settlement-ledger"
      aria-labelledby="ledger-heading"
      className="w-full bg-[#FFFFFF] pt-8 pb-12 scroll-mt-[100px]"
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 w-full my-12 bg-[#FFFFFF]">
        
        {/* Header with inline-block text wrapping to lock punctuation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end pb-8 mb-8">
          <div className="lg:col-span-7 min-w-0">
            <h2
              id="ledger-heading"
              className="m-0 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[0.92] uppercase text-black"
            >
              <span className="inline-block whitespace-nowrap">ONE CONTRACT<span className="text-[#B8FF00]">.</span></span>{' '}
              <span className="inline-block whitespace-nowrap">ONE INVOICE<span className="text-[#B8FF00]">.</span></span>{' '}
              LOCKED BEFORE THE STARTING <span className="inline-block whitespace-nowrap">SIREN<span className="text-[#B8FF00]">.</span></span>
            </h2>
          </div>
          <div className="lg:col-span-5 min-w-0">
            <p className="m-0 text-sm sm:text-base text-neutral-600 leading-relaxed font-sans">
              Traditional sponsorship traps elite contenders in ninety-day payment terms, lost paperwork, and out-of-pocket travel overhead. tmrw/<span className="text-[#B8FF00]">.</span> eliminates friction with absolute financial certainty. Capital clears directly into the contender's account prior to competition day, their grassroots club secures its clean dividend, and an immutable tax invoice executes instantly.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch w-full">
          {/* Left Column: Kinetic Video Specimen with Elite Grain Overlay */}
          <div className="lg:col-span-6 rounded-[24px] overflow-hidden relative aspect-[4/3] bg-neutral-950 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col justify-between p-6 sm:p-8">
            <video
              ref={videoRef}
              autoPlay
              muted={isMuted}
              playsInline
              onTimeUpdate={handleTimeUpdate}
              className="absolute inset-0 h-full w-full object-contain bg-black contrast-[1.18] saturate-[0.8] brightness-[0.92]"
              src="/tmrw-surfer-loop.mp4"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"
            />
            <FilmGrainOverlay intensity="fine" />

            {/* Technical crosshairs */}
            <span className="absolute top-6 left-6 text-neutral-400 font-mono text-xs pointer-events-none z-10">+</span>
            <span className="absolute top-6 right-6 text-neutral-400 font-mono text-xs pointer-events-none z-10">+</span>

            <div className="relative z-10 flex items-center justify-between">
              <span className="bg-[#CCFF00] text-black font-mono font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider shadow-[0_0_10px_rgba(204,255,0,0.3)]">
                CASE SPECIMEN · SURFING
              </span>

              {/* Mute / Unmute Toggle Button */}
              <button
                type="button"
                onClick={toggleMute}
                className="font-mono text-[10px] text-white uppercase tracking-widest bg-black/60 hover:bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer z-20"
              >
                <span className={`inline-block w-2 h-2 rounded-full ${!isMuted ? 'bg-[#CCFF00] animate-pulse' : 'bg-neutral-400'}`} />
                {isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO'}
              </button>
            </div>

            <div className="relative z-10 text-white">
              <span className="text-2xl sm:text-3xl font-bold uppercase tracking-tight block text-white drop-shadow-md">
                HUNTER CLARK
              </span>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs font-mono uppercase tracking-wider text-neutral-200 drop-shadow-sm">
                <span>WSL QUALIFYING SERIES</span>
                <span>·</span>
                <span className="text-[#CCFF00] font-bold">8KM RADIAL LOCK · BROOKVALE</span>
              </div>
              <div className="mt-2 text-[10px] font-mono tracking-widest text-neutral-300 uppercase">
                33.7195° S, 151.3032° E · HEAT 03 SEED
              </div>
            </div>
          </div>

          {/* Right Column: RCTI Invoice Panel */}
          <div className="lg:col-span-6 flex flex-col justify-between py-2 px-1">
            
            {/* Wieden+Kennedy Refined Editorial Vault Seal */}
            <div className="flex justify-between items-center border-b-2 border-neutral-900 pb-4 mb-4">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900">
                RCTI · RECIPIENT CREATED TAX INVOICE
              </span>
              
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#B8FF00] animate-pulse" />
                <span className="text-neutral-900 font-bold">VAULT CLEARED</span>
                <span className="text-neutral-300">·</span>
                <span className="text-neutral-500">SETTLED PRIOR TO KICKOFF</span>
              </div>
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

            {/* Premium 4-Layer Lit Button Specimen */}
            <button
              type="button"
              onClick={() => setIsReceiptModalOpen(true)}
              className="w-full bg-[#0F0F11] text-white font-mono font-bold text-xs py-4 px-6 rounded-xl transition-all uppercase tracking-wider text-center cursor-pointer mt-4 block shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-2px_0_rgba(0,0,0,0.8),0_10px_25px_rgba(0,0,0,0.3),0_0_15px_rgba(184,255,0,0.15)] hover:bg-neutral-900 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-2px_0_rgba(0,0,0,0.9),0_15px_30px_rgba(0,0,0,0.4),0_0_25px_rgba(184,255,0,0.3)] active:translate-y-[1px]"
            >
              INSPECT AUDITED CLEARING RECEIPT →
            </button>
          </div>
        </div>
      </div>

      {/* Brutalist Receipt Modal */}
      {isReceiptModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsReceiptModalOpen(false)}
        >
          <div
            className="bg-white border-2 border-black max-w-xl w-full p-8 md:p-10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Masthead */}
            <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-black">
              <h3 className="font-mono font-bold text-lg uppercase tracking-tight text-black m-0">
                AUDITED CLEARING CERTIFICATE // H. CLARK
              </h3>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="font-mono font-bold text-xs uppercase tracking-wider text-black hover:text-neutral-600 transition-colors"
              >
                [CLOSE]
              </button>
            </div>

            {/* Certificate Rows */}
            <div className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-[160px_1fr] gap-4 pb-3 border-b border-neutral-300">
                <span className="uppercase tracking-wider text-neutral-500 font-medium">TRANSACTION ID</span>
                <span className="font-bold text-black">TX-2026-NARRABEEN-0841</span>
              </div>
              
              <div className="grid grid-cols-[160px_1fr] gap-4 pb-3 border-b border-neutral-300">
                <span className="uppercase tracking-wider text-neutral-500 font-medium">ESCROW STATUS</span>
                <span className="font-bold text-black">RELEASED VIA INSTITUTIONAL LEDGER</span>
              </div>
              
              <div className="grid grid-cols-[160px_1fr] gap-4 pb-3 border-b border-neutral-300">
                <span className="uppercase tracking-wider text-neutral-500 font-medium">COMMERCIAL RETENTION</span>
                <span className="font-bold text-black">$2,500.00 AUD (PRE-SIREN DEPOSIT)</span>
              </div>
              
              <div className="grid grid-cols-[160px_1fr] gap-4 pb-3 border-b border-neutral-300">
                <span className="uppercase tracking-wider text-neutral-500 font-medium">DISBURSEMENT</span>
                <span className="font-bold text-black">$1,750.00 AUD TO H. CLARK (DIRECT STRIPE PAYOUT)</span>
              </div>
              
              <div className="grid grid-cols-[160px_1fr] gap-4 pb-3 border-b border-neutral-300">
                <span className="uppercase tracking-wider text-neutral-500 font-medium">CLUB CONTRIBUTION</span>
                <span className="font-bold text-black">$375.00 AUD TO NORTH NARRABEEN BOARDRIDERS</span>
              </div>
              
              <div className="grid grid-cols-[160px_1fr] gap-4 pb-3 border-b border-neutral-300">
                <span className="uppercase tracking-wider text-neutral-500 font-medium">TAX DOCUMENT</span>
                <span className="font-bold text-black">ATO / NZ IRD COMPLIANT RCTI GENERATED</span>
              </div>
            </div>

            {/* Upgraded 4-Layer Lit Button for Modal Close */}
            <button
              type="button"
              onClick={() => setIsReceiptModalOpen(false)}
              className="w-full mt-8 bg-[#0F0F11] text-white font-mono font-bold text-xs py-4 px-6 rounded-xl transition-all uppercase tracking-wider text-center cursor-pointer block shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-2px_0_rgba(0,0,0,0.8),0_10px_25px_rgba(0,0,0,0.3),0_0_15px_rgba(184,255,0,0.15)] hover:bg-neutral-900 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-2px_0_rgba(0,0,0,0.9),0_15px_30px_rgba(0,0,0,0.4),0_0_25px_rgba(184,255,0,0.3)] active:translate-y-[1px]"
            >
              CLOSE CERTIFICATE
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default SettlementLedger;