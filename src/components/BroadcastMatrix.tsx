import React from 'react';

const PAGE_SHELL = 'max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 w-full';

interface BroadcastRegister {
  figure: string;
  label: string;
  body: string | React.ReactNode;
  badge?: string;
  live?: boolean;
  showSplitBar?: boolean;
  showRadiusBar?: boolean;
}

interface BroadcastCarrier {
  kind: string;
  name: string;
  Mark: React.FC;
}

const REGISTERS: readonly BroadcastRegister[] = [
  {
    figure: '15,000',
    label: 'PATHWAY CONTENDERS',
    body: 'Emerging 18-to-25 talent dominating televised state and national leagues without a commercial retainer, from NBL1, Shute Shield, VFL, and Hostplus Cup to Sal’s NBL and Olympic trials.',
  },
  {
    figure: '$0.00',
    label: 'BROADCAST DIVIDEND',
    body: 'What filters back to the athletes and junior clubs generating the ratings. Networks sell the airtime. Contenders carry the cost of the runway.',
    badge: 'CURRENT MEDIAN',
  },
  {
    figure: '70/15/15',
    label: 'THE CLEARING PROTOCOL',
    body: (
      <>
        <span className="bg-[#CCFF00] text-[#0F0F11] font-semibold px-1.5 py-0.5 rounded-[3px]">
          No agents
        </span>{' '}
        taking a clip.{' '}
        <span className="bg-[#CCFF00] text-[#0F0F11] font-semibold px-1.5 py-0.5 rounded-[3px]">
          No chasing invoices
        </span>
        .{' '}
        <span className="bg-[#CCFF00] text-[#0F0F11] font-semibold px-1.5 py-0.5 rounded-[3px]">
          Pre-cleared deals
        </span>
        , instant payouts, and a hardwired split backing you and the junior club that built you on the road to LA 2028 and Brisbane 2032.
      </>
    ),
    live: true,
    showSplitBar: true,
  },
  {
    figure: 'LOCAL',
    label: 'DIRECT HANDLE SPONSORSHIP',
    badge: 'POSTCODE AD DOMINANCE',
    body: (
      <>
        Followers don’t pay rent. Automated{' '}
        <span className="bg-[#CCFF00] text-[#0F0F11] font-semibold px-1.5 py-0.5 rounded-[3px]">
          API handle linking
        </span>{' '}
        and postcode token locks let local brands run geo-fenced Meta and TikTok ads straight through your verified handle for{' '}
        <span className="bg-[#CCFF00] text-[#0F0F11] font-semibold px-1.5 py-0.5 rounded-[3px]">
          paid social amplification
        </span>{' '}
        across a 5km to 50km radius.
      </>
    ),
    live: true,
    showRadiusBar: true,
  },
];

const MARK_IMG = 'w-auto object-contain object-left';

const ChannelNineMark: React.FC = () => (
  <img
    src="/logos/National_Nine_Network_Logo_1969.svg"
    alt="Channel 9"
    className={'h-5 ' + MARK_IMG}
  />
);

const StanSportMark: React.FC = () => (
  <img
    src="/logos/stan-sport-mono.png"
    alt="Stan Sport"
    className={'h-6 ' + MARK_IMG + ' brightness-0'}
  />
);

const KayoMark: React.FC = () => (
  <img
    src="/logos/kayo-sports-mono.png"
    alt="Kayo"
    className="h-5 w-auto object-contain object-left"
  />
);

const TenPlayMark: React.FC = () => (
  <svg
    viewBox="0 0 1569.37 623.62"
    className="h-5 w-auto"
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
    className={'h-5 ' + MARK_IMG}
  />
);

const SkySportNzMark: React.FC = () => (
  <img
    src="/logos/Sky_Sport_NZ_2019.svg.webp"
    alt="Sky Sport NZ"
    className={'h-4 ' + MARK_IMG + ' brightness-0'}
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

const MARK_WRAP = 'h-6 flex items-center justify-start w-full overflow-hidden';

export const BroadcastMatrix: React.FC = () => (
  <section
    id="mandate"
    aria-labelledby="mandate-heading"
    className={PAGE_SHELL + ' pt-6 pb-14 scroll-mt-[74px] bg-transparent text-[#0F0F11]'}
  >
    {/* Compact Masthead Lockup (02 // Header Removed Completely) */}
    <div className="pb-8 border-b border-neutral-200">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-end">
        <h2
          id="mandate-heading"
          className="lg:col-span-7 m-0 font-sans text-4xl sm:text-5xl lg:text-[3.85rem] xl:text-[4.35rem] font-black tracking-[-0.045em] uppercase text-[#0F0F11] leading-[0.92]"
        >
          <span className="block">
            15,000 athletes on live TV
            <span className="text-[#CCFF00] drop-shadow-[0_0_16px_rgba(204,255,0,0.85)]">.</span>
          </span>
          <span className="mt-1 block">
            Zero commercial retainers
            <span className="text-[#CCFF00] drop-shadow-[0_0_16px_rgba(204,255,0,0.85)]">.</span>
          </span>
        </h2>

        <div className="lg:col-span-5 lg:border-l lg:border-neutral-200 lg:pl-8">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-neutral-400 mb-2 block">
            STRUCTURAL MARKET DEFICIT
          </span>
          <p className="m-0 font-sans text-sm sm:text-base font-medium leading-[1.48] text-[#0F0F11]">
            Every weekend, emerging Australian and New Zealand contenders fill broadcast slots for major networks while seeing zero commercial return. tmrw<span className="text-[#CCFF00] font-black">/.</span> turns live screen time into direct brand cash, sponsored feed amplification, and club dividends<span className="text-[#CCFF00] font-black">.</span>
          </p>
        </div>
      </div>
    </div>

    {/* Tightened 4-Column Register Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-neutral-200 py-8 mb-6">
      {REGISTERS.map((register) => (
        <div
          key={register.label}
          className="group py-6 first:pt-0 last:pb-0 lg:py-0 lg:px-7 first:lg:pl-0 last:lg:pr-0 flex flex-col justify-between"
        >
          <div>
            <p className="m-0 font-sans text-5xl xl:text-6xl font-black tracking-[-0.04em] text-[#0F0F11] tabular-nums transition-all duration-300 ease-out will-change-transform group-hover:scale-[1.02]">
              {register.figure}
            </p>
            <div className="mt-3 mb-2 flex flex-wrap items-center gap-2">
              <p className="m-0 text-[11px] font-mono font-semibold uppercase text-[#0F0F11] tracking-[0.12em]">
                {register.label}
              </p>
              {register.badge ? (
                <span className="text-[9px] font-mono bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-[3px] tracking-wider">
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
            <p className="m-0 text-xs sm:text-[13px] font-sans text-neutral-600 leading-relaxed max-w-sm">
              {register.body}
            </p>
          </div>

          {register.showSplitBar ? (
            <div
              className="mt-4 flex h-[3px] w-full overflow-hidden"
              role="img"
              aria-label="70 per cent athlete, 15 per cent junior club, 15 per cent platform operations and escrow"
            >
              <span className="block h-full w-[70%] bg-[#0F0F11]" />
              <span className="block h-full w-[15%] bg-neutral-400" />
              <span className="block h-full w-[15%] bg-[#CCFF00]" />
            </div>
          ) : null}

          {register.showRadiusBar ? (
            <div
              className="mt-4 flex h-[3px] w-full overflow-hidden"
              role="img"
              aria-label="5km local storefront ring, 15km suburban trade catchment, 50km regional hub"
            >
              <span className="block h-full w-[55%] bg-[#CCFF00]" />
              <span className="block h-full w-[30%] bg-[#0F0F11]" />
              <span className="block h-full w-[15%] bg-neutral-400" />
            </div>
          ) : null}
        </div>
      ))}
    </div>

    {/* Broadcast Network Strip */}
    <div className="pt-4 border-t border-neutral-200">
      <div className="flex items-center justify-between mb-3">
        <p className="m-0 text-[10px] font-mono font-semibold uppercase tracking-[0.16em] text-neutral-500">
          CARRIED LIVE ON
        </p>
        <p className="m-0 text-[10px] font-mono uppercase tracking-[0.16em] text-neutral-400">
          6 NATIONAL BROADCAST CARRIERS · AU &amp; NZ
        </p>
      </div>
      <ul className="m-0 p-0 list-none grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {CARRIERS.map((carrier) => (
          <li
            key={carrier.name}
            className="h-16 bg-[#FAFAFA] border border-neutral-200 rounded-lg px-3.5 py-2.5 flex flex-col justify-between hover:border-[#0F0F11] hover:bg-white transition-all"
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
    </div>
  </section>
);

export default BroadcastMatrix;