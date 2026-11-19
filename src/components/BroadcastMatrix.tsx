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

const REGISTERS: readonly BroadcastRegister[] = [
  {
    figure: 'LOCAL',
    label: 'PATHWAY ATHLETES',
    body: 'It takes training, travel and people who turn up to get an athlete to game day.',
  },
  {
    figure: 'CLUB',
    label: 'THE PEOPLE BEHIND THE PLAY',
    body: 'The club that opens the gates, lends the gear and gets the team on the road has a stake in what comes next.',
  },
  {
    figure: '70/15/15',
    label: 'EXAMPLE SPONSORSHIP SPLIT',
    body: 'One way the money could be shared: 70% to the athlete, 15% to their grassroots club and 15% to TMRWLine. No payment or timing is promised.',
    showSplitBar: true,
  },
  {
    figure: 'LOCAL',
    label: 'DIRECT HANDLE SPONSORSHIP',
    badge: 'POSTCODE AD DOMINANCE',
    body: (
      <>
        Followers don’t pay rent. Automated{' '}
        <span className="bg-volt text-[#0F0F11] font-semibold px-1.5 py-0.5 rounded-[3px]">
          API handle linking
        </span>{' '}
        and postcode token locks let local brands run geo-fenced Meta and TikTok ads straight through your verified handle for{' '}
        <span className="bg-volt text-[#0F0F11] font-semibold px-1.5 py-0.5 rounded-[3px]">
          paid social amplification
        </span>{' '}
        across a 5km to 50km radius.
      </>
    ),
    live: true,
    showRadiusBar: true,
  },
];

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
            Before the cameras roll.
          </span>
          <span className="mt-1 block">
            Local sport puts in the work.
          </span>
        </h2>

        <div className="lg:col-span-5 lg:border-l lg:border-neutral-200 lg:pl-8">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-neutral-400 mb-2 block">
            THE WORK BEFORE GAME DAY
          </span>
          <p className="m-0 font-sans text-sm sm:text-base font-medium leading-[1.48] text-[#0F0F11]">
            Travel, gear and training add up. Local businesses can help cover those costs by backing athletes and their clubs.
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
                  <span className="absolute inset-0 rounded-full bg-volt opacity-80 blur-[3px]" />
                  <span className="relative h-[6px] w-[6px] rounded-full bg-volt" />
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
              <span className="block h-full w-[15%] bg-volt" />
            </div>
          ) : null}

          {register.showRadiusBar ? (
            <div
              className="mt-4 flex h-[3px] w-full overflow-hidden"
              role="img"
              aria-label="5km local storefront ring, 15km suburban trade catchment, 50km regional hub"
            >
              <span className="block h-full w-[55%] bg-volt" />
              <span className="block h-full w-[30%] bg-[#0F0F11]" />
              <span className="block h-full w-[15%] bg-neutral-400" />
            </div>
          ) : null}
        </div>
      ))}
    </div>

  </section>
);

export default BroadcastMatrix;