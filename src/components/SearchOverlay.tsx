import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchAthletes } from '../api';
import type { Athlete } from '../types';
import { athleteDisplayName, athleteInitials } from '../lib/formatName';
import { formatAudCompact } from '../lib/formatMoney';
import { BrandLockup } from './BrandLockup';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  /** Logo click: close the overlay and reset the app to the home view. */
  onHome: () => void;
  /** "Sponsor" on a result card. The host closes the overlay and opens the deploy drawer. */
  onSponsorAthlete?: (athlete: Athlete) => void;
}

type FilterId = 'all' | 'nbl1' | 'shute' | 'vfl' | 'qld' | 'catchment';

const FILTERS: ReadonlyArray<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'All Codes' },
  { id: 'nbl1', label: 'NBL1 Basketball' },
  { id: 'shute', label: 'Shute Shield Rugby' },
  { id: 'vfl', label: 'VFL Football' },
  { id: 'qld', label: 'Queensland Premier' },
  { id: 'catchment', label: 'Catchment Postcodes' },
];

const norm = (s: unknown): string => (typeof s === 'string' ? s.toLowerCase() : '');

/** Free-text haystack for one athlete (location may be a PostGIS blob, so only strings count). */
function haystack(a: Athlete): string {
  return [
    a.name,
    a.full_name,
    a.sport,
    a.current_club,
    a.club,
    a.postcode,
    a.tier_tag,
    typeof a.location === 'string' ? a.location : '',
  ]
    .map(norm)
    .join(' ');
}

const QLD_TERMS = ['queensland', 'qld', 'brisbane', 'gold coast', 'sunshine coast'];

function matchesFilter(a: Athlete, filter: FilterId): boolean {
  const sport = norm(a.sport);
  const text = haystack(a);
  switch (filter) {
    case 'all':
      return true;
    case 'nbl1':
      return sport.includes('basketball') || text.includes('nbl1');
    case 'shute':
      return sport.includes('rugby') || a.shute_shield_compliant || text.includes('shute');
    case 'vfl':
      return sport.includes('afl') || sport.includes('australian rules') || text.includes('vfl');
    case 'qld':
      return (a.postcode ?? '').startsWith('4') || QLD_TERMS.some((t) => text.includes(t));
    case 'catchment':
      return Boolean(a.postcode);
  }
}

const formatAud = (n: number) => formatAudCompact(n);

const valuationOf = (a: Athlete): number | null => {
  const v = a.profile_data?.market_value_aud;
  return typeof v === 'number' && v > 0 ? v : null;
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Cleared',
  pending: 'Pending',
  expired: 'Expired',
};

interface SuburbMetric {
  postcode: string;
  athletes: number;
  codes: string[];
  followers: number;
  valuation: number;
}

function buildSuburbMetrics(rows: readonly Athlete[]): SuburbMetric[] {
  const byPostcode = new Map<string, SuburbMetric & { codeSet: Set<string> }>();
  for (const a of rows) {
    if (!a.postcode) continue;
    const entry =
      byPostcode.get(a.postcode) ??
      { postcode: a.postcode, athletes: 0, codes: [], followers: 0, valuation: 0, codeSet: new Set<string>() };
    entry.athletes += 1;
    entry.followers += a.follower_count ?? 0;
    entry.valuation += valuationOf(a) ?? 0;
    if (a.sport) entry.codeSet.add(a.sport);
    byPostcode.set(a.postcode, entry);
  }
  return [...byPostcode.values()]
    .map(({ codeSet, ...m }) => ({ ...m, codes: [...codeSet] }))
    .sort((a, b) => b.athletes - a.athletes || a.postcode.localeCompare(b.postcode));
}

const CloseIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

const MagnifierIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-6 h-6 shrink-0 text-[#080808]"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.8-3.8" />
  </svg>
);

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose, onHome, onSponsorAthlete }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load the live roster the first time the overlay opens, then reuse it.
  useEffect(() => {
    if (!isOpen || loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    fetchAthletes()
      .then((rows) => setAthletes(rows))
      .catch(() => {
        loadedRef.current = false; // allow a retry on the next open
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  // Reset on close so the next open starts clean; focus the input on open.
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setFilter('all');
      return;
    }
    inputRef.current?.focus();
  }, [isOpen]);

  const q = query.trim().toLowerCase();
  const showResults = q.length > 0 || filter !== 'all';

  const results = useMemo(() => {
    if (!showResults) return [];
    return athletes.filter((a) => {
      if (!matchesFilter(a, filter)) return false;
      if (!q) return true;
      // In catchment mode the query is a postcode lookup.
      return filter === 'catchment' ? (a.postcode ?? '').startsWith(q) : haystack(a).includes(q);
    });
  }, [athletes, filter, q, showResults]);

  const suburbs = useMemo(() => buildSuburbMetrics(results), [results]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search verified athletes"
      data-lenis-prevent
      className="fixed inset-0 z-50 bg-[#F7F7F6] overflow-y-auto px-6 md:px-12 py-10 animate-fadeIn"
    >
      <div className="w-full max-w-[1400px] mx-auto">
        {/* Top action bar */}
        <div className="flex items-start justify-between mb-12 md:mb-16">
          <BrandLockup tone="light" onClick={onHome} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="inline-flex items-center justify-center p-0 bg-transparent border-0 text-[#080808] hover:text-[#B8FF00] transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#080808] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F7F6]"
          >
            <CloseIcon />
          </button>
        </div>

        <h1 className="m-0 font-display font-extrabold text-6xl md:text-8xl tracking-tight text-[#080808] mb-4">
          Search
        </h1>
        <p className="m-0 text-sm md:text-base text-[#666666] max-w-xl mb-8 leading-relaxed">
          Browse, search, or discover verified suburban talent. Every profile is pre-cleared for direct
          commercial endorsement.
        </p>

        {/* Pill input */}
        <div className="w-full bg-[#EFEFED] rounded-full px-6 py-4 flex items-center justify-between border border-transparent focus-within:border-[#080808] transition-all duration-200 mb-6">
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              filter === 'catchment' ? 'Enter a postcode, e.g. 2000' : 'Search athletes, codes, clubs or postcodes'
            }
            aria-label="Search athletes, codes, clubs or postcodes"
            className="w-full bg-transparent border-0 p-0 m-0 shadow-none text-base md:text-lg text-[#080808] placeholder-[#999999] outline-none font-medium"
          />
          <span className="ml-4 inline-flex">
            <MagnifierIcon />
          </span>
        </div>

        {/* Discovery filters */}
        <div role="group" aria-label="Filter by code" className="flex flex-wrap gap-2 mb-12">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-4 py-2 text-xs md:text-sm font-semibold border transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#080808] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F7F6] ${
                  active
                    ? 'bg-[#080808] text-white border-[#080808]'
                    : 'bg-transparent text-[#080808] border-[#080808]/25 hover:bg-[#B8FF00] hover:border-[#B8FF00]'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Results preview */}
        <div aria-live="polite">
          {!showResults ? (
            <p className="m-0 font-mono text-[11px] uppercase tracking-[0.2em] text-[#999999]">
              Type a name, club, code or postcode to preview the roster
            </p>
          ) : loading ? (
            <p className="m-0 font-mono text-[11px] uppercase tracking-[0.2em] text-[#666666]">
              Loading roster…
            </p>
          ) : results.length === 0 ? (
            <p className="m-0 font-mono text-[11px] uppercase tracking-[0.2em] text-[#666666]">
              No verified athletes match “{query.trim() || FILTERS.find((f) => f.id === filter)?.label}”
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 pb-10">
              {/* Column 1: roster cards */}
              <section aria-labelledby="search-athletes-heading">
                <h2
                  id="search-athletes-heading"
                  className="m-0 mb-4 font-mono text-xs uppercase tracking-widest text-[#666666]"
                >
                  Athletes · {results.length}
                </h2>
                <ul className="m-0 p-0 list-none flex flex-col gap-3">
                  {results.map((a) => {
                    const name = athleteDisplayName(a);
                    const value = valuationOf(a);
                    return (
                      <li key={a.id || name} className="m-0 p-0">
                        <article className="flex items-center gap-4 rounded-2xl bg-white border border-[#EAEAEA] p-4">
                          <div
                            aria-hidden="true"
                            className="shrink-0 w-12 h-12 rounded-full bg-[#080808] text-white flex items-center justify-center font-display font-extrabold text-sm"
                          >
                            {a.initials || athleteInitials(name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="m-0 font-display font-extrabold text-lg text-[#080808] tracking-tight truncate">
                              {name}
                            </h3>
                            <p className="m-0 mt-0.5 text-sm text-[#666666] truncate">
                              {[a.sport, a.current_club].filter(Boolean).join(' · ') || '—'}
                            </p>
                            <p className="m-0 mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#666666]">
                              {a.postcode ? `PC ${a.postcode}` : 'No postcode'}
                              {' · '}
                              {STATUS_LABEL[a.agreement_status] ?? 'Open'}
                              {value ? ` · ${formatAud(value)}` : ''}
                            </p>
                          </div>
                          {onSponsorAthlete && (
                            <button
                              type="button"
                              onClick={() => onSponsorAthlete(a)}
                              className="shrink-0 rounded-full bg-[#080808] text-[#F7F7F6] px-4 py-2 text-[11px] font-bold uppercase tracking-wider border-0 cursor-pointer hover:bg-[#B8FF00] hover:text-[#080808] transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#080808] focus-visible:ring-offset-2"
                            >
                              Sponsor →
                            </button>
                          )}
                        </article>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {/* Column 2: suburb metrics */}
              <section aria-labelledby="search-suburbs-heading">
                <h2
                  id="search-suburbs-heading"
                  className="m-0 mb-4 font-mono text-xs uppercase tracking-widest text-[#666666]"
                >
                  Suburb metrics · {suburbs.length}
                </h2>
                {suburbs.length === 0 ? (
                  <p className="m-0 text-sm text-[#666666]">No postcode data for these athletes.</p>
                ) : (
                  <ul className="m-0 p-0 list-none flex flex-col gap-3">
                    {suburbs.map((s) => (
                      <li key={s.postcode} className="m-0 p-0">
                        <article className="rounded-2xl bg-[#EFEFED] p-5">
                          <div className="flex items-baseline justify-between gap-4">
                            <p className="m-0 font-display font-extrabold text-3xl tracking-tight text-[#080808]">
                              {s.postcode}
                            </p>
                            <p className="m-0 font-mono text-[10px] font-bold uppercase tracking-widest text-[#666666]">
                              {s.athletes} {s.athletes === 1 ? 'athlete' : 'athletes'}
                            </p>
                          </div>
                          {(s.followers > 0 || s.valuation > 0) && (
                            <dl className="m-0 mt-4 grid grid-cols-2 gap-4">
                              {s.followers > 0 && (
                                <div>
                                  <dt className="font-mono text-[10px] uppercase tracking-widest text-[#666666]">
                                    Combined reach
                                  </dt>
                                  <dd className="m-0 mt-1 font-mono text-sm font-bold text-[#080808] tabular-nums">
                                    {String(Math.trunc(s.followers))}
                                  </dd>
                                </div>
                              )}
                              {s.valuation > 0 && (
                                <div>
                                  <dt className="font-mono text-[10px] uppercase tracking-widest text-[#666666]">
                                    Dynamic valuation
                                  </dt>
                                  <dd className="m-0 mt-1 font-mono text-sm font-bold text-[#080808] tabular-nums">
                                    {formatAud(s.valuation)}
                                  </dd>
                                </div>
                              )}
                            </dl>
                          )}
                          {s.codes.length > 0 && (
                            <p className="m-0 mt-4 text-xs text-[#666666]">{s.codes.join(' · ')}</p>
                          )}
                        </article>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;
