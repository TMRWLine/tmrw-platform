import React, { useEffect, useState } from 'react';
import type { LandingSectionId } from './Navigation';
import { CourtLinesOverlay } from './CourtLinesOverlay';
import { RollingPillButton } from './RollingPillButton';

export const PAGE_SHELL = 'max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 w-full';

interface CoverHeroProps {
  onNavigateSection?: (id: LandingSectionId) => void;
}

const INTRO_WORDS = ['Line', 'up', 'your', 'future'];

const PULSE_BLINK_CSS =
  '@keyframes tmrwPulseBlink {' +
  '0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 18px rgba(204, 255, 0, 0.95); }' +
  '50% { opacity: 0.15; transform: scale(0.82); box-shadow: 0 0 4px rgba(204, 255, 0, 0.2); }' +
  '}' +
  '.tmrw-dot-blink { animation: tmrwPulseBlink 1.05s cubic-bezier(0.4, 0, 0.6, 1) infinite; }';

export const CoverHero: React.FC<CoverHeroProps> = ({ onNavigateSection }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [phase, setPhase] = useState<'intro' | 'settled'>('intro');
  const [visibleWords, setVisibleWords] = useState<number>(0);

  useEffect(() => {
    const timers: number[] = [];

    INTRO_WORDS.forEach((_, idx) => {
      const t = window.setTimeout(() => {
        setVisibleWords(idx + 1);
      }, 260 + idx * 340);
      timers.push(t);
    });

    const settleTimer = window.setTimeout(() => {
      setPhase('settled');
    }, 2800);
    timers.push(settleTimer);

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const isIntro = phase === 'intro';

  const scrollToRoster = () => {
    if (onNavigateSection) {
      onNavigateSection('roster');
      return;
    }
    document.getElementById('roster')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="pb-12 md:pb-20">
      <section
        aria-label="tmrw cover"
        className="relative flex min-h-[82vh] w-full select-none flex-col justify-between overflow-hidden rounded-[28px] border border-[#EAEAEA] bg-[#080808] p-8 shadow-sm md:rounded-[32px] md:p-14"
        onMouseMove={(e) => {
          if (isIntro) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          setMousePos({ x: x * 32, y: y * 32 });
        }}
        onMouseLeave={() => {
          setMousePos({ x: 0, y: 0 });
        }}
      >
        <style>{PULSE_BLINK_CSS}</style>

        <img
          src="/coverpage.jpg"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          draggable={false}
          className={[
            'pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-center transition-all duration-1000 ease-out',
            isIntro ? 'opacity-30 blur-[3px] scale-110' : 'opacity-100 blur-0 scale-[1.04]',
          ].join(' ')}
          style={{
            transform: isIntro
              ? 'scale(1.1)'
              : 'scale(1.04) translate3d(' +
                -mousePos.x * 0.25 +
                'px, ' +
                -mousePos.y * 0.25 +
                'px, 0)',
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_20%_40%,rgba(235,59,48,0.28)_0%,transparent_60%)]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-black/35"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 transition-transform duration-500 ease-out"
          style={{
            transform: 'translate3d(' + mousePos.x * 0.6 + 'px, ' + mousePos.y * 0.6 + 'px, 0)',
            background:
              'radial-gradient(ellipse 70% 50% at 50% 65%, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.45) 80%, transparent 100%)',
          }}
        />

        <CourtLinesOverlay />

        {/* Pure Central Headline */}
        <div className="relative z-10 my-auto flex h-[56vh] w-full items-center justify-center">
          <div
            onClick={() => {
              if (isIntro) setPhase('settled');
            }}
            style={{
              transform: isIntro
                ? 'scale(1.12)'
                : 'translate3d(' + mousePos.x * 0.18 + 'px, ' + mousePos.y * 0.18 + 'px, 0) scale(1)',
            }}
            className="transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform"
          >
            {isIntro ? (
              <h1 className="m-0 block text-center font-display font-extrabold leading-[0.92] tracking-tight text-[#F7F7F6] drop-shadow-[0_8px_36px_rgba(0,0,0,0.9)] text-7xl sm:text-8xl md:text-[7.5rem] lg:text-[9.2rem]">
                <span className="block">
                  <span
                    className={[
                      'inline-block transition-all duration-300',
                      visibleWords >= 1
                        ? 'opacity-100 translate-y-0 blur-0'
                        : 'opacity-0 translate-y-3 blur-sm',
                    ].join(' ')}
                  >
                    Line
                  </span>{' '}
                  <span
                    className={[
                      'inline-block transition-all duration-300',
                      visibleWords >= 2
                        ? 'opacity-100 translate-y-0 blur-0'
                        : 'opacity-0 translate-y-3 blur-sm',
                    ].join(' ')}
                  >
                    up
                  </span>
                </span>
                <span className="block">
                  <span
                    className={[
                      'inline-block transition-all duration-300',
                      visibleWords >= 3
                        ? 'opacity-100 translate-y-0 blur-0'
                        : 'opacity-0 translate-y-3 blur-sm',
                    ].join(' ')}
                  >
                    your
                  </span>{' '}
                  <span
                    className={[
                      'inline-block whitespace-nowrap transition-all duration-300',
                      visibleWords >= 4
                        ? 'opacity-100 translate-y-0 blur-0'
                        : 'opacity-0 translate-y-3 blur-sm',
                    ].join(' ')}
                  >
                    future
                    <span
                      aria-hidden="true"
                      className="tmrw-dot-blink ml-2.5 inline-block h-4 w-4 rounded-full bg-[#CCFF00] align-baseline shadow-[0_0_24px_rgba(204,255,0,1)] md:h-6 md:w-6"
                    />
                  </span>
                </span>
              </h1>
            ) : (
              <h1 className="m-0 block max-w-[12ch] text-center font-display font-extrabold leading-[0.96] tracking-tight text-[#F7F7F6] drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)] transition-all duration-700 text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem]">
                Line up your{' '}
                <span className="whitespace-nowrap">
                  future
                  <span
                    aria-hidden="true"
                    className="tmrw-dot-blink ml-2 inline-block h-3.5 w-3.5 shrink-0 rounded-full bg-[#CCFF00] align-baseline opacity-100 shadow-[0_0_16px_rgba(204,255,0,0.95)] md:h-4 md:w-4"
                  />
                </span>
              </h1>
            )}
          </div>
        </div>

        {/* Buttons Split Perfectly Across Either Side of the Center Guideline */}
        <div
          className={[
            'relative z-20 flex w-full items-center justify-between px-4 pb-2 transition-all duration-700 md:px-12',
            isIntro ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0',
          ].join(' ')}
        >
          <div className="flex justify-start">
            <RollingPillButton variant="primary" onClick={scrollToRoster}>
              Explore the Roster
            </RollingPillButton>
          </div>
          <div className="flex justify-end">
            <RollingPillButton
              variant="glass"
              onClick={() => {
                if (onNavigateSection) {
                  onNavigateSection('syndicate');
                  return;
                }
                window.location.assign('/brisbane-2032-runway');
              }}
            >
              Brisbane 2032 Runway
            </RollingPillButton>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CoverHero;