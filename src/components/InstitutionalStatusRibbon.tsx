import { useEffect, useState, type RefObject } from 'react';

type MarketId = 'SYD' | 'BNE' | 'AKL';

const MARKETS: { id: MarketId; currency: 'AUD' | 'NZD' }[] = [
  { id: 'SYD', currency: 'AUD' },
  { id: 'BNE', currency: 'AUD' },
  { id: 'AKL', currency: 'NZD' },
];

export function InstitutionalStatusRibbon({ anchorRef }: { anchorRef: RefObject<HTMLElement> }) {
  const [top, setTop] = useState(0);
  const [market, setMarket] = useState<MarketId>('SYD');
  const currency = MARKETS.find((m) => m.id === market)?.currency ?? 'AUD';

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const update = () => setTop(el.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [anchorRef]);

  return (
    <div
      className="fixed left-0 w-full z-40 bg-[#08080A]/95 border-b border-white/10 px-6 py-2 text-xs font-mono text-neutral-400 flex items-center justify-between gap-4 pointer-events-auto"
      style={{ top }}
      role="status"
      aria-label="Institutional network status"
    >
      <span className="truncate min-w-0">
        NETWORK STATUS: OPERATIONAL // 3,000 VERIFIED SPECIMENS UNLOCKED // 2026 CATEGORY LOCKS: 42% ALLOCATED
      </span>
      <span className="hidden lg:inline-flex items-center gap-2 flex-shrink-0 text-[#D2FF00]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[#D2FF00] opacity-75 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#D2FF00]" />
        </span>
        BRISBANE 2032 RUNWAY // REGULATORY BYLAWS CLEARED
      </span>
      <span className="hidden md:inline-flex items-center gap-1 flex-shrink-0" role="radiogroup" aria-label="Market">
        MARKET:
        {MARKETS.map((m, i) => (
          <span key={m.id} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-neutral-600">/</span>}
            <button
              type="button"
              role="radio"
              aria-checked={market === m.id}
              onClick={() => setMarket(m.id)}
              className={`bg-transparent border-0 p-0 font-mono text-xs cursor-pointer transition-colors ${
                market === m.id ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {m.id}
            </button>
          </span>
        ))}
        <span className="ml-1">
          [<span className={currency === 'AUD' ? 'text-[#D2FF00]' : ''}>AUD</span>/
          <span className={currency === 'NZD' ? 'text-[#D2FF00]' : ''}>NZD</span>]
        </span>
      </span>
    </div>
  );
}
