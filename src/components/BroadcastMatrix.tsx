import React from 'react';
import { PAGE_SHELL } from './CoverHero';

interface BroadcastRegister {
  figure: string;
  label: string;
  body: string | React.ReactNode;
  badge?: string;
  live?: boolean;
  showSplitBar?: boolean;
}

interface BroadcastCarrier {
  kind: string;
  name: string;
  Mark: React.FC;
}

const REGISTERS: readonly BroadcastRegister[] = [
  {
    figure: '15,000',
    label: 'PATHWAY COMPETITORS',
    body: 'Active competitors across national leagues without commercial retainers, including NBL1, Shute Shield, VFL, Hostplus Cup, and Olympic selection trials.',
  },
  {
    figure: '$0.00',
    label: 'DIRECT BROADCAST DIVIDEND',
    body: 'Nil commercial remuneration from television rights. Zero payment flowing back to the athletes generating the ratings.',
    badge: 'CURRENT MEDIAN',
  },
  {
    figure: '70/15/15',
    label: 'THE CLEARING PROTOCOL',
    body: (
      <>
        <span className="bg-[#CCFF00] text-black font-semibold px-1 py-0.5 rounded-sm">No agents</span>
        . <span className="bg-[#CCFF00] text-black font-semibold px-1 py-0.5 rounded-sm">No chasing payments</span>
        . Just <span className="bg-[#CCFF00] text-black font-semibold px-1.5 py-0.5 rounded-sm">secure brand deals</span>
        , fast payouts, and a clean split supporting your local club and your journey towards LA 2028, Brisbane 2032 and beyond.
      </>
    ),
    live: true,
    showSplitBar: true,
  },
];

const MARK_IMG = 'w-auto object-contain object-left';

const ChannelNineMark: React.FC = () => (
  <img
    src="/logos/National_Nine_Network_Logo_1969.svg"
    alt="Channel 9"
    className={`h-6 ${MARK_IMG}`}
  />
);

const StanSportMark: React.FC = () => (
  <img
    src="/logos/stan-sport-mono.png"
    alt="Stan Sport"
    className={`h-7 ${MARK_IMG} brightness-0`}
  />
);

const KayoMark: React.FC = () => (
  <img
    src="/logos/kayo-sports-mono.png"
    alt="Kayo"
    className="h-[22px] w-auto object-contain object-left"
  />
);

const TenPlayMark: React.FC = () => (
  <svg
    viewBox="0 0 1569.37 623.62"
    className="h-6 w-auto"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="10 Play"
  >
    <title>10 Play</title>
    <path
      d="M968.87 139.64v267.69a6.73 6.73 0 0 1-6.74 6.68H910a6.73 6.73 0 0 1-6.74-6.68V139.64A6.73 6.73 0 0 1 910 133h52.14a6.73 6.73 0 0 1 6.73 6.64zm-82 172.17c0 69.46-38.4 105.83-85.78 105.83a72.63 72.63 0 0 1-38.61-11.33V484a6.73 6.73 0 0 1-6.74 6.68h-52.18a6.74 6.74 0 0 1-6.75-6.68V216.3a6.74 6.74 0 0 1 6.75-6.69h52.14a6.73 6.73 0 0 1 6.74 6.69v1a72.55 72.55 0 0 1 38.61-11.3c47.38 0 85.78 38.88 85.78 105.81zm-65.63 0c-1.08-35.2-17-50.59-34.69-51.59-17.06-1-24.07 9.61-24.07 23.3v56.59c0 13.69 7 24.27 24.07 23.3 17.62-1 33.57-16.41 34.65-51.6zm354.1-25.15v120.61a6.76 6.76 0 0 1-6.74 6.74h-52.14a6.76 6.76 0 0 1-6.74-6.74v-1a72.63 72.63 0 0 1-38.61 11.33c-47.38 0-85.78-36.37-85.78-105.83 0-48.18 27.56-105.83 95-105.83s94.97 38.65 94.97 80.72zm-65.62-3.14c0-13.69-7-24.28-24.07-23.3-17.66 1-33.61 16.39-34.69 51.59 1.08 35.2 17 50.6 34.69 51.6 17.06 1 24.07-9.61 24.07-23.3zm258.11-73.91h-57.16a7.63 7.63 0 0 0-7 5.45s-28.9 113.13-29 113.43c-.12-.28-29-113.43-29-113.43a7.63 7.63 0 0 0-7-5.45h-57.27c-3.71 0-5.84 2.9-4.72 6.44l62.39 198c-1.83 21.68-16.52 23.35-48.63 23.35a6.74 6.74 0 0 0-6.69 6.75v39.82a6.73 6.73 0 0 0 6.69 6.74c78.71 0 101.56-20.11 119.68-76.69l62.39-197.93c1.12-3.58-1.01-6.48-4.72-6.48z"
      fill="#0F0F11"
    />
    <path
      d="M1563.23 321c8.19-5.06 8.19-13.34 0-18.4l-147.07-90.74c-8.2-5.06-14.91-1.32-14.91 8.31v183.27c0 9.63 6.71 13.38 14.91 8.32z"
      fill="#0F0F11"
    />
    <circle cx="311.81" cy="311.81" r="311.81" fill="#0F0F11" />
    <path
      fill="#FFFFFF"
      d="M376.3 165.26a146.52 146.52 0 0 0-129 76.9v-70.88h-91.58v281.06h91.61v-70.88a146.56 146.56 0 1 0 129-216.2zm0 201.5a54.95 54.95 0 1 1 54.95-54.95 54.95 54.95 0 0 1-54.96 54.95z"
    />
    <path
      fill="#FFFFFF"
      d="M100.78 226.23v91.6a146.55 146.55 0 0 0 146.55-146.55h-91.61a55 55 0 0 1-54.94 54.95z"
    />
  </svg>
);

const SevenPlusMark: React.FC = () => (
  <img
    src="/logos/7plus-wordmark.svg"
    alt="7plus"
    className={`h-6 ${MARK_IMG}`}
  />
);

const SkySportNzMark: React.FC = () => (
  <img
    src="/logos/Sky_Sport_NZ_2019.svg.webp"
    alt="Sky Sport NZ"
    className={`h-[18px] ${MARK_IMG} brightness-0`}
  />
);

const CARRIERS: readonly BroadcastCarrier[] = [
  { kind: 'FREE-TO-AIR · AU', name: 'CHANNEL 9', Mark: ChannelNineMark },
  { kind: 'STREAMING · AU', name: 'STAN SPORT', Mark: StanSportMark },
  { kind: 'STREAMING · AU', name: 'KAYO SPORTS', Mark: KayoMark },
  { kind: 'FREE-TO-AIR · AU', name: '10 PLAY', Mark: TenPlayMark },
  { kind: 'FREE-TO-AIR · AU', name: '7PLUS', Mark: SevenPlusMark },
  { kind: 'PAY TV · NZ', name: 'SKY SPORT NZ', Mark: SkySportNzMark },
];

const MARK_WRAP = 'h-8 flex items-center justify-start w-full overflow-hidden';

/** Page Two. PAGE_SHELL tracks the hero card perimeter exactly. */
export const BroadcastMatrix: React.FC = () => (
  <section
    id="mandate"
    aria-labelledby="mandate-heading"
    className={`${PAGE_SHELL} mt-24 md:mt-32 mb-28 scroll-mt-[74px] bg-transparent text-neutral-900`}
  >
    <style>{`
      @keyframes marquee {
        0% {
          transform: translateX(0%);
        }
        100% {
          transform: translateX(-50%);
        }
      }
      .marquee-container {
        animation: marquee 30s linear infinite;
        display: inline-flex;
        white-space: nowrap;
      }
    `}</style>
    <div className="pb-12 border-b border-neutral-200">
      <div className="overflow-hidden text-xs font-mono uppercase tracking-widest text-neutral-400 mb-6">
        <div className="marquee-container">
          <span className="tracking-widest pr-16">INDEPENDENT AUDIT · CAPITAL DEFICIT REGISTER · NATIONAL AIRTIME MONETISATION INDEX · AU & NZ</span>
          <span className="tracking-widest pr-16">INDEPENDENT AUDIT · CAPITAL DEFICIT REGISTER · NATIONAL AIRTIME MONETISATION INDEX · AU & NZ</span>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        <h2
          id="mandate-heading"
          className="lg:col-span-7 m-0 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight uppercase text-neutral-900 leading-tight"
        >
          15,000 ATHLETES ON LIVE TV. ZERO COMMERCIAL RETAINERS.
        </h2>
        <div className="lg:col-span-5 pb-1">
          <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2 block">
            STRUCTURAL MARKET DEFICIT
          </span>
          <p className="m-0 text-sm md:text-base text-neutral-600 leading-relaxed font-sans">
            The hard work starts long before the spotlight. While national competitors generate millions in broadcast value for television networks, they receive zero commercial return. tmrw/. converts that screen time into direct cash, backing every brand partnership with verified performance data.
          </p>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-200 py-12 mb-10">
      {REGISTERS.map((register) => (
        <div
          key={register.label}
          className="group py-8 first:pt-0 last:pb-0 md:py-0 md:px-10 first:md:pl-0 last:md:pr-0"
        >
          <p className="m-0 text-6xl lg:text-7xl font-bold tracking-tighter text-neutral-900 tabular-nums transition-all duration-300 ease-out will-change-transform group-hover:scale-[1.02] group-hover:tracking-tight">
            {register.figure}
          </p>
          <div className="mt-4 mb-2 flex flex-wrap items-center gap-2">
            <p className="m-0 text-xs font-mono uppercase text-neutral-400 tracking-wider">
              {register.label}
            </p>
            {register.badge ? (
              <span className="text-[10px] font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded">
                {register.badge}
              </span>
            ) : null}
            {register.live ? (
              <span className="relative flex h-[6px] w-[6px] shrink-0" aria-hidden="true">
                <span className="absolute inset-0 rounded-full bg-[#CCFF00] opacity-80 blur-[3px]" />
                <span className="relative h-[6px] w-[6px] rounded-full bg-[#CCFF00]" />
              </span>
            ) : null}
          </div>
          <p className="m-0 text-xs font-sans text-neutral-600 leading-relaxed max-w-sm">
            {register.body}
          </p>
          {register.showSplitBar ? (
            <div
              className="mt-5 flex h-[3px] w-full overflow-hidden"
              role="img"
              aria-label="70 per cent athlete, 15 per cent junior club, 15 per cent platform operations and escrow"
            >
              <span className="block h-full w-[70%] bg-[#0F0F11]" />
              <span className="block h-full w-[15%] bg-neutral-400" />
              <span className="block h-full w-[15%] bg-[#CCFF00]" />
            </div>
          ) : null}
        </div>
      ))}
    </div>

    <p className="m-0 text-[11px] font-mono uppercase tracking-widest text-neutral-400 mb-4">
      CARRIED LIVE ON
    </p>
    <ul className="m-0 p-0 list-none grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {CARRIERS.map((carrier) => (
        <li
          key={carrier.name}
          className="h-20 bg-[#FAFAFA] border border-neutral-200 rounded-xl px-4 py-3 flex flex-col justify-between hover:border-black hover:bg-white transition-all"
        >
          <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
            {carrier.kind}
          </span>
          <div className={MARK_WRAP}>
            <carrier.Mark />
          </div>
        </li>
      ))}
    </ul>

    <div className="pt-6 overflow-hidden text-[11px] font-mono uppercase text-neutral-400 tracking-widest">
      <div className="marquee-container">
        <span className="pr-16">OFFICIAL REGISTER · ASC AND TRIBUNAL BENCHMARK DATA · SETTLEMENT PROTOCOL · DIRECT AUD ESCROW ACTIVE</span>
        <span className="pr-16">OFFICIAL REGISTER · ASC AND TRIBUNAL BENCHMARK DATA · SETTLEMENT PROTOCOL · DIRECT AUD ESCROW ACTIVE</span>
      </div>
    </div>
  </section>
);

export default BroadcastMatrix;
