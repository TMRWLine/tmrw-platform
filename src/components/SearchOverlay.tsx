import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  EMPTY_ROSTER_FILTERS,
  matchesRosterDiscovery,
  ROSTER_COMPETITIONS,
  ROSTER_DATA,
  suburbForPostcode,
  writeRosterDiscovery,
} from '../data/roster';
import { THE_ROSTER_PATH } from '../lib/routes';
import { BrandLockup } from './BrandLockup';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onHome: () => void;
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

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose, onHome }) => {
  const [filters, setFilters] = useState(EMPTY_ROSTER_FILTERS);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
    else setFilters(EMPTY_ROSTER_FILTERS);
  }, [isOpen]);

  const showResults = Boolean(filters.query.trim() || filters.competition !== 'all' || filters.catchment.trim());
  const results = useMemo(
    () => showResults ? ROSTER_DATA.filter(({ record }) => matchesRosterDiscovery(record, filters)) : [],
    [filters, showResults],
  );
  const catchments = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { postcode } of results) {
      if (/^\d{4}$/.test(postcode)) counts.set(postcode, (counts.get(postcode) ?? 0) + 1);
    }
    return [...counts].sort(([a, aCount], [b, bCount]) => bCount - aCount || a.localeCompare(b));
  }, [results]);

  const rosterHref = (athleteId?: string) => {
    const params = writeRosterDiscovery(filters);
    if (athleteId) params.set('athlete', athleteId);
    const search = params.toString();
    return search ? `${THE_ROSTER_PATH}?${search}` : THE_ROSTER_PATH;
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search athlete profiles"
      data-lenis-prevent
      className="mobile-overlay search-overlay fixed inset-0 z-50 bg-[#F7F7F6] overflow-y-auto px-6 md:px-12 py-10 animate-fadeIn"
    >
      <div className="w-full max-w-[1400px] mx-auto">
        <div className="flex items-start justify-between mb-12 md:mb-16">
          <BrandLockup tone="light" onClick={onHome} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="inline-flex items-center justify-center p-0 bg-transparent border-0 text-[#080808] hover:text-neutral-600 transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#080808] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F7F6]"
          >
            <CloseIcon />
          </button>
        </div>

        <h1 className="m-0 font-display font-extrabold text-6xl md:text-8xl tracking-tight text-[#080808] mb-4">
          Search
        </h1>
        <p className="m-0 text-sm md:text-base text-[#666666] max-w-xl mb-8 leading-relaxed">
          Search the same illustrative profiles as The Roster. A profile is not a sponsorship offer or permission to use an athlete’s name, image or likeness.
        </p>

        <div className="w-full bg-[#EFEFED] rounded-full px-6 py-4 flex items-center justify-between border border-transparent focus-within:border-[#080808] transition-all duration-200 mb-6">
          <input
            ref={inputRef}
            type="search"
            maxLength={100}
            autoComplete="off"
            spellCheck={false}
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            placeholder="Search athletes, clubs or competitions"
            aria-label="Search athletes, clubs or competitions"
            className="w-full bg-transparent border-0 p-0 m-0 shadow-none text-base md:text-lg text-[#080808] placeholder-[#666666] outline-none font-medium"
          />
          <span className="ml-4 inline-flex">
            <MagnifierIcon />
          </span>
        </div>

        <div role="group" aria-label="Competition" className="flex flex-wrap gap-2 mb-4">
          {ROSTER_COMPETITIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={filters.competition === id}
              onClick={() => setFilters({ ...filters, competition: id })}
              className={`min-h-11 rounded-full px-4 py-2 text-xs md:text-sm font-semibold border transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#080808] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F7F6] ${
                filters.competition === id
                  ? 'bg-[#080808] text-white border-[#080808]'
                  : 'bg-transparent text-[#080808] border-[#080808]/25 hover:bg-neutral-100 hover:border-[#080808]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mb-8 flex flex-wrap items-end gap-x-6 gap-y-3">
          <label className="grid w-full max-w-xs gap-1 text-sm font-semibold text-[#080808]">
            Catchment
            <input
              type="search"
              maxLength={80}
              autoComplete="off"
              value={filters.catchment}
              onChange={(e) => setFilters({ ...filters, catchment: e.target.value })}
              aria-label="Catchment suburb or postcode"
              placeholder="Suburb or four-digit postcode"
              className="m-0 min-h-11 w-full rounded-full border border-[#080808]/25 bg-transparent px-4 py-2 text-base font-normal text-[#080808] shadow-none placeholder-[#666666] focus-visible:outline-[#080808]"
            />
          </label>
          {showResults && (
            <button type="button" onClick={() => setFilters(EMPTY_ROSTER_FILTERS)} className="min-h-11 border-0 bg-transparent p-0 text-sm font-semibold underline underline-offset-4 text-[#080808] cursor-pointer">
              Clear search and filters
            </button>
          )}
        </div>

        <div className="mb-6 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <p role="status" className="m-0 font-mono text-xs tracking-wide text-[#666666]">
            {!showResults
              ? 'Type a name, club or competition, or filter by catchment.'
              : results.length
                ? `${results.length} ${results.length === 1 ? 'profile' : 'profiles'}`
                : 'No roster profiles match. Try changing your search or filters.'}
          </p>
          <a href={rosterHref()} className="inline-flex min-h-11 items-center text-sm font-semibold text-[#080808] underline underline-offset-4">
            {showResults ? 'View results on The Roster' : 'Browse The Roster'}
          </a>
        </div>

        {results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 pb-10">
            <section aria-labelledby="search-athletes-heading">
              <h2 id="search-athletes-heading" className="m-0 mb-4 font-mono text-xs uppercase tracking-widest text-[#666666]">
                Athletes
              </h2>
              <ul className="m-0 p-0 list-none flex flex-col gap-3">
                {results.map(({ record, initials, postcode }) => (
                  <li key={record.id} className="m-0 p-0">
                    <article className="flex items-center gap-4 rounded-2xl bg-white border border-[#EAEAEA] p-4">
                      <div aria-hidden="true" className="shrink-0 w-12 h-12 rounded-full bg-[#080808] text-white flex items-center justify-center font-display font-extrabold text-sm">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="m-0 font-display font-extrabold text-lg text-[#080808] tracking-tight">
                          <a href={rosterHref(record.id)} className="text-[#080808] underline underline-offset-4">
                            {record.full_name}
                          </a>
                        </h3>
                        <p className="m-0 mt-0.5 text-sm text-[#666666]">
                          {record.current_club} · {record.league}
                        </p>
                        <p className="m-0 mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#666666]">
                          Illustrative profile · Catchment {postcode}
                        </p>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="search-catchments-heading">
              <h2 id="search-catchments-heading" className="m-0 mb-4 font-mono text-xs uppercase tracking-widest text-[#666666]">
                Postcode catchments · {catchments.length}
              </h2>
              <ul className="m-0 p-0 list-none flex flex-col gap-3">
                {catchments.map(([postcode, count]) => (
                  <li key={postcode} className="m-0 p-0">
                    <article className="rounded-2xl bg-[#EFEFED] p-5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="m-0 font-display font-extrabold text-3xl tracking-tight text-[#080808]">{postcode}</p>
                        <p className="m-0 font-mono text-[10px] font-bold uppercase tracking-widest text-[#666666]">
                          {count} {count === 1 ? 'profile' : 'profiles'}
                        </p>
                      </div>
                      <p className="m-0 mt-1 text-sm text-[#666666]">{suburbForPostcode(postcode)}</p>
                    </article>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchOverlay;
