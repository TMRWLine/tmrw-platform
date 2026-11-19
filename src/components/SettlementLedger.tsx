import React, { useEffect, useState, useRef } from 'react';
import { useReducedMotion } from '../lib/useReducedMotion';
import { FilmGrainOverlay } from './FilmGrainOverlay';
import { useDialogFocus } from '../lib/useDialogFocus';

const GROSS = '$2500 AUD';
const ATHLETE = '$1750 AUD';
const CLUB = '$375 AUD';
const ESCROW = '$375 AUD';

export const SettlementLedger: React.FC = () => {
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const reducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  useDialogFocus(isReceiptModalOpen, receiptRef, () => setIsReceiptModalOpen(false));

  useEffect(() => {
    if (!isReceiptModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const preventBackgroundScroll = (event: Event) => {
      const panel = receiptRef.current;
      const isZoomGesture =
        (event.type === 'wheel' && (event as WheelEvent).ctrlKey) ||
        (event.type === 'touchmove' && (event as TouchEvent).touches.length > 1);
      if (isZoomGesture) return;
      if (!panel || !panel.contains(event.target as Node) || panel.scrollHeight <= panel.clientHeight) {
        event.preventDefault();
      }
    };
    document.addEventListener('wheel', preventBackgroundScroll, { passive: false });
    document.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('wheel', preventBackgroundScroll);
      document.removeEventListener('touchmove', preventBackgroundScroll);
    };
  }, [isReceiptModalOpen]);

  useEffect(() => {
    if (reducedMotion) videoRef.current?.pause();
  }, [reducedMotion]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Seamless loop cutoff before logo appears
  const handleTimeUpdate = () => {
    if (videoRef.current && !videoRef.current.paused && videoRef.current.currentTime >= 7.8) {
      videoRef.current.currentTime = 0;
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
              A$2,500 IN. WHO GETS WHAT?
            </h2>
          </div>
          <div className="lg:col-span-5 min-w-0">
            <p className="m-0 text-sm sm:text-base text-neutral-600 leading-relaxed font-sans">
              Back the athlete and the club behind them. Here’s one way a local sponsorship could be split. Confirm the amounts, payment timing and paperwork in your agreement before you commit.
            </p>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 items-start gap-10 lg:grid-cols-2">
          {/* Left Column: Kinetic Video Specimen with Elite Grain Overlay */}
          <div className="relative flex aspect-[4/3] w-full min-w-0 flex-col justify-between overflow-hidden rounded-[24px] bg-neutral-950 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] sm:p-8">
            <video
              ref={videoRef}
              autoPlay={!reducedMotion}
              preload={reducedMotion ? 'none' : 'auto'}
              poster="/surfer.jpg"
              muted={isMuted}
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onError={() => setVideoUnavailable(true)}
              onLoadedData={() => setVideoUnavailable(false)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
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

            <div data-video-unavailable={videoUnavailable} className="relative z-10 flex flex-wrap items-center justify-between gap-2">
              <span className="bg-volt text-black font-mono font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider shadow-[0_0_10px_rgba(184,255,0,0.3)]">
                ILLUSTRATIVE FOOTAGE · SURFING
              </span>

              <div className="flex flex-wrap gap-2">
              {videoUnavailable ? (
                <span role="status" className="ledger-video-unavailable hidden font-mono text-[10px] text-white bg-black/80 px-3 py-1 rounded-full">
                  VIDEO UNAVAILABLE
                </span>
              ) : null}
              <button
                type="button"
                onClick={togglePlayback}
                className="ledger-playback-toggle rounded-full border border-white/70 bg-black px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                {isPlaying ? 'Pause video' : 'Play video'}
              </button>
              <button
                type="button"
                onClick={toggleMute}
                aria-pressed={!isMuted}
                className="ledger-audio-toggle rounded-full border border-white/70 bg-black px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                {isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO'}
              </button>
              </div>
            </div>

            <div className="relative z-10 text-white">
              <span className="text-2xl sm:text-3xl font-bold uppercase tracking-tight block text-white drop-shadow-md">
                Before the first heat
              </span>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs font-mono uppercase tracking-wider text-neutral-200 drop-shadow-sm">
                <span>Local sport. Local backing.</span>
              </div>
            </div>
          </div>

          {/* Right Column: RCTI Invoice Panel */}
          <div className="flex min-w-0 flex-col justify-between px-1 py-2">
            
            {/* Wieden+Kennedy Refined Editorial Vault Seal */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b-2 border-neutral-900 pb-4">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900">
                THE LOCAL RECEIPT
              </span>
              
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                <span className="text-neutral-900 font-bold">ILLUSTRATIVE SAMPLE · NOT A PAYMENT</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 py-4 border-b border-neutral-200 font-mono text-xs uppercase">
              <div>
                <span className="text-neutral-600 text-[10px] block mb-0.5">SPONSOR</span>
                <span className="font-bold text-neutral-950 block">Example local business</span>
              </div>
              <div>
                <span className="text-neutral-600 text-[10px] block mb-0.5">ATHLETE</span>
                <span className="font-bold text-neutral-950 block">Example local athlete</span>
              </div>
            </div>

            <div className="w-full space-y-3 py-4 border-b border-neutral-200 font-mono text-xs uppercase">
              <div className="flex justify-between items-baseline text-neutral-500">
                <span>EXAMPLE SPONSORSHIP TOTAL</span>
                <span className="text-neutral-950 font-bold text-base">{GROSS}</span>
              </div>

              <div className="flex justify-between items-center text-neutral-950 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                <div>
                  <span className="font-bold block">ATHLETE (70%)</span>
                </div>
                <span className="font-bold text-xl text-neutral-950">{ATHLETE}</span>
              </div>

              <div className="flex justify-between items-center text-neutral-700 px-1">
                <div>
                  <span className="block font-medium">GRASSROOTS CLUB (15%)</span>
                </div>
                <span className="font-semibold text-neutral-950">{CLUB}</span>
              </div>

              <div className="flex justify-between items-center text-neutral-700 px-1">
                <div>
                  <span className="block font-medium">TMRWLINE (15%)</span>
                </div>
                <span className="font-semibold text-neutral-950">{ESCROW}</span>
              </div>
            </div>

            <p className="py-4 border-b border-neutral-200 text-sm text-neutral-600">The club share could help cover entry fees, gear or travel. This example does not record a payment or establish tax treatment.</p>

            {/* Premium 4-Layer Lit Button Specimen */}
            <button
              type="button"
              onClick={() => setIsReceiptModalOpen(true)}
              className="w-full bg-[#0F0F11] text-white font-mono font-bold text-xs py-4 px-6 rounded-xl transition-all uppercase tracking-wider text-center cursor-pointer mt-4 block shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-2px_0_rgba(0,0,0,0.8),0_10px_25px_rgba(0,0,0,0.3),0_0_15px_rgba(184,255,0,0.15)] hover:bg-neutral-900 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-2px_0_rgba(0,0,0,0.9),0_15px_30px_rgba(0,0,0,0.4),0_0_25px_rgba(184,255,0,0.3)] active:translate-y-[1px]"
            >
              VIEW THE SAMPLE RECEIPT →
            </button>
          </div>
        </div>
      </div>

      {/* Brutalist Receipt Modal */}
      {isReceiptModalOpen && (
        <div
          data-lenis-prevent="true"
          className="mobile-overlay certificate-backdrop fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsReceiptModalOpen(false)}
        >
          <div
            ref={receiptRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-heading"
            className="certificate-panel bg-white border-2 border-black max-w-xl w-full p-8 md:p-10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Masthead */}
            <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-black">
              <h3 id="receipt-heading" className="font-mono font-bold text-lg uppercase tracking-tight text-black m-0">
                SAMPLE RECEIPT · NOT A PAYMENT
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
                <span className="uppercase tracking-wider text-neutral-500 font-medium">EXAMPLE TOTAL</span>
                <span className="font-bold text-black">{GROSS}</span>
              </div>
              
              <div className="grid grid-cols-[160px_1fr] gap-4 pb-3 border-b border-neutral-300">
                <span className="uppercase tracking-wider text-neutral-500 font-medium">ATHLETE (70%)</span>
                <span className="font-bold text-black">{ATHLETE}</span>
              </div>
              
              <div className="grid grid-cols-[160px_1fr] gap-4 pb-3 border-b border-neutral-300">
                <span className="uppercase tracking-wider text-neutral-500 font-medium">CLUB (15%)</span>
                <span className="font-bold text-black">{CLUB}</span>
              </div>
              
              <div className="grid grid-cols-[160px_1fr] gap-4 pb-3 border-b border-neutral-300">
                <span className="uppercase tracking-wider text-neutral-500 font-medium">TMRWLINE (15%)</span>
                <span className="font-bold text-black">{ESCROW}</span>
              </div>
            </div>

            {/* Upgraded 4-Layer Lit Button for Modal Close */}
            <button
              type="button"
              onClick={() => setIsReceiptModalOpen(false)}
              className="w-full mt-8 bg-[#0F0F11] text-white font-mono font-bold text-xs py-4 px-6 rounded-xl transition-all uppercase tracking-wider text-center cursor-pointer block shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-2px_0_rgba(0,0,0,0.8),0_10px_25px_rgba(0,0,0,0.3),0_0_15px_rgba(184,255,0,0.15)] hover:bg-neutral-900 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-2px_0_rgba(0,0,0,0.9),0_15px_30px_rgba(0,0,0,0.4),0_0_25px_rgba(184,255,0,0.3)] active:translate-y-[1px]"
            >
              CLOSE SAMPLE RECEIPT
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default SettlementLedger;