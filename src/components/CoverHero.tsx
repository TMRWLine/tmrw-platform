import React, { useEffect, useState } from 'react';
import type { LandingSectionId } from './Navigation';
import { CourtLinesOverlay } from './CourtLinesOverlay';
import { RollingPillButton } from './RollingPillButton';

export const PAGE_SHELL = 'max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 w-full';

interface CoverHeroProps {
  onNavigateSection?: (id: LandingSectionId) => void;
}

interface SpatialNode {
  id: string;
  text: string;
  x: number;
  y: number;
}

const SPATIAL_QUOTES: readonly SpatialNode[] = [
  { id: 'center', text: 'Line up your future', x: 0, y: 0 },
  { id: 'q1', text: "Exposure doesn't pay rent", x: -28, y: -25 },
  { id: 'q2', text: 'No agents taking a cut', x: 28, y: -24 },
  { id: 'q3', text: "The grind isn't free content", x: -30, y: 4 },
  { id: 'q4', text: 'Own your local postcode', x: 30, y: 6 },
  { id: 'q5', text: '70% straight to your bank', x: -24, y: 27 },
  { id: 'q6', text: '15% back to your junior club', x: 26, y: 26 },
  { id: 'q7', text: 'First grade to Brisbane 2032', x: 0, y: -31 },
  { id: 'q8', text: 'Your name. Your likeness. Your bag', x: -18, y: -13 },
  { id: 'q9', text: 'Live minutes into fast cash', x: 20, y: -13 },
];

const INTRO_WORDS = ['Line', 'up', 'your', 'future'];

const PULSE_BLINK_CSS =
  '@keyframes tmrwPulseBlink {' +
  '0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 18px rgba(204, 255, 0, 0.95); }' +
  '50% { opacity: 0.15; transform: scale(0.82); box-shadow: 0 0 4px rgba(204, 255, 0, 0.2); }' +
  '}' +
  '.tmrw-dot-blink { animation: tmrwPulseBlink 1.05s cubic-bezier(0.4, 0, 0.6, 1) infinite; }';

export const CoverHero: React.FC<CoverHeroProps> = ({ onNavigateSection }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeNodeId, setActiveNodeId] = useState<string>('center');
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
    }, 2900);
    timers.push(settleTimer);

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const activeNode = SPATIAL_QUOTES.find((n) => n.id === activeNodeId) ?? SPATIAL_QUOTES[0];
  const isIntro = phase === 'intro';

  const scrollToRoster = () => {
    if (onNavigateSection) {
      onNavigateSection('roster');
      return;
    }
    document.getElementById('roster')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderStatementWithDot = (text: string, isActive: boolean, isCenterAnchor: boolean) => {
    const words = text.trim().split(' ');
    const lastWord = words.pop() ?? '';
    const leadingWords = words.join(' ');

    if (isCenterAnchor && isIntro) {
      return (
        <span className="block text-center font-extrabold leading-[0.92] tracking-tight text-[#F7F7F6] drop-shadow-[0_8px_36px_rgba(0,0,0,0.9)] text-7xl sm:text-8xl md:text-[7.5rem] lg:text-[9.2rem]">
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
        </span>
      );
    }

    return (
      <span
        className={[
          'block text-center font-extrabold leading-[0.96] tracking-tight text-[#F7F7F6] drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)] transition-all duration-700',
          isCenterAnchor
            ? 'max-w-[12ch] text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem]'
            : 'max-w-[13ch] text-4xl sm:text-5xl md:text-6xl',
        ].join(' ')}
      >
        {leadingWords ? leadingWords + ' ' : ''}
        <span className="whitespace-nowrap">
          {lastWord}
          <span
            aria-hidden="true"
            className={[
              'ml-2 inline-block shrink-0 rounded-full bg-[#CCFF00] align-baseline transition-all duration-500',
              isActive
                ? 'tmrw-dot-blink h-3.5 w-3.5 opacity-100 shadow-[0_0_16px_rgba(204,255,0,0.95)] md:h-4 md:w-4'
                : 'h-2 w-2 opacity-40',
            ].join(' ')}
          />
        </span>
      </span>
    );
  };

  return (
    <div className="pb-4">
      <section
        aria-label="tmrw cover"
        className="relative flex min-h-[82vh] w-full select-none flex-col justify-between overflow-hidden rounded-[28px] border border-[#EAEAEA] bg-[#080808] p-8 shadow-sm md:rounded-[32px] md:p-14"
        onMouseMove={(e) => {
          if (isIntro) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          setMousePos({ x: x * 36, y: y * 36 });
        }}
        onMouseLeave={() => {
          setMousePos({ x: 0, y: 0 });
          setActiveNodeId('center');
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
                (-activeNode.x * 0.25 - mousePos.x * 0.2) +
                'px, ' +
                (-activeNode.y * 0.25 - mousePos.y * 0.2) +
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

        <div
          className="relative z-10 my-auto flex h-[56vh] w-full items-center justify-center transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform"
          style={{
            transform:
              'translate3d(' + -activeNode.x * 0.75 + '%, ' + -activeNode.y * 0.75 + '%, 0)',
          }}
        >
          {SPATIAL_QUOTES.map((node) => {
            const isActive = node.id === activeNodeId;
            const isCenterAnchor = node.id === 'center';

            const peripheralOpacityClass = isIntro
              ? 'opacity-10 blur-[3px] pointer-events-none'
              : 'opacity-25 blur-[1.5px] hover:opacity-60 hover:blur-0';

            const scaleVal = isCenterAnchor && isIntro ? 1.12 : isActive ? 1 : 0.44;

            return (
              <button
                key={node.id}
                type="button"
                onClick={() => {
                  if (isIntro) {
                    setPhase('settled');
                    return;
                  }
                  setActiveNodeId(isActive ? 'center' : node.id);
                }}
                onMouseEnter={() => {
                  if (!isIntro) setActiveNodeId(node.id);
                }}
                style={{
                  left: 50 + node.x + '%',
                  top: 50 + node.y + '%',
                  transform: 'translate(-50%, -50%) scale(' + scaleVal + ')',
                }}
                className={[
                  'absolute cursor-pointer border-0 bg-transparent p-2 text-center font-display transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[transform,opacity,filter] focus:outline-none',
                  isActive ? 'z-30 opacity-100 blur-0' : 'z-10 ' + peripheralOpacityClass,
                ].join(' ')}
              >
                {renderStatementWithDot(node.text, isActive, isCenterAnchor)}
              </button>
            );
          })}
        </div>

        <div
          className={[
            'relative z-20 flex flex-col items-center gap-5 transition-all duration-700',
            isIntro ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0',
          ].join(' ')}
        >
          <div className="mx-auto flex w-full max-w-lg flex-wrap items-center justify-center gap-4">
            <RollingPillButton variant="primary" onClick={scrollToRoster}>
              Explore the Roster
            </RollingPillButton>
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