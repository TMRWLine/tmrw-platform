import { useMemo, useState } from 'react';
import {
  Search,
  MapPin,
  Briefcase,
  Users,
  X,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Mail,
  Send,
  ChevronDown,
  Target,
  Crosshair,
} from 'lucide-react';
import type { Athlete, Sponsor } from '../types';
import { formatCurrency, generateContractReview } from '../api';
import { athleteInitials, displayName } from '../lib/formatName';

type IndustryFilter = 'all' | 'fitness' | 'auto' | 'food' | 'apparel' | 'physio';

const INDUSTRY_MAP: Record<IndustryFilter, string[]> = {
  all: [],
  fitness: ['gym', 'fitness', 'training', 'coaching', 'health & wellness'],
  auto: ['automotive', 'auto', 'car', 'vehicle', 'dealership'],
  food: ['food', 'beverage', 'cafe', 'restaurant', 'nutrition', 'hospitality'],
  apparel: ['apparel', 'fashion', 'clothing', 'sporting goods', 'retail'],
  physio: ['physio', 'allied health', 'therapy', 'medical', 'recovery', 'clinic'],
};

const POSTCODE_SUBURB_MAP: Record<string, string> = {
  '2000': 'Sydney, NSW',
  '2010': 'Surry Hills, NSW',
  '2020': 'Bondi, NSW',
  '2030': 'Randwick, NSW',
  '2040': 'Marrickville, NSW',
  '2060': 'North Sydney, NSW',
  '2090': 'Manly, NSW',
  '2100': 'Gold Coast, QLD',
  '2150': 'Parramatta, NSW',
  '2300': 'Newcastle, NSW',
  '2500': 'Wollongong, NSW',
  '2600': 'Canberra, ACT',
  '3000': 'Melbourne, VIC',
  '3006': 'Southbank, VIC',
  '3008': 'Docklands, VIC',
  '3040': 'Craigieburn, VIC',
  '3065': 'Fitzroy, VIC',
  '3070': 'Reservoir, VIC',
  '3108': 'Doncaster, VIC',
  '3121': 'Richmond, VIC',
  '3150': 'Mount Waverley, VIC',
  '3182': 'St Kilda, VIC',
  '3205': 'South Melbourne, VIC',
  '4000': 'Brisbane, QLD',
  '4050': 'Brisbane North, QLD',
  '4101': 'Red Hill, QLD',
  '4170': 'Carindale, QLD',
  '5000': 'Adelaide, SA',
  '6000': 'Perth, WA',
  '6008': 'Subiaco, WA',
  '6100': 'East Perth, WA',
  '7000': 'Hobart, TAS',
  '8000': 'Darwin, NT',
  '1010': 'Auckland Central, NZ',
  '1021': 'Parnell, NZ',
  '6011': 'Wellington, NZ',
  '8011': 'Christchurch, NZ',
};

function postcodeToSuburb(postcode: string | null): string {
  if (!postcode) return 'Location unavailable';
  return POSTCODE_SUBURB_MAP[postcode] ?? `Postcode ${postcode}`;
}

function matchesIndustry(category: string | null, filter: IndustryFilter): boolean {
  if (filter === 'all') return true;
  if (!category) return false;
  const lower = category.toLowerCase();
  return INDUSTRY_MAP[filter].some((kw) => lower.includes(kw));
}

function haversineKm(
  lat1: number | null,
  lng1: number | null,
  lat2: number | null,
  lng2: number | null
): number {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return Infinity;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type OutreachState = {
  loading: boolean;
  result: { subject: string; copy: string; cached: boolean } | null;
  error: string | null;
  copied: boolean;
};

export function SponsorDirectory({
  sponsors,
  athletes,
}: {
  sponsors: Sponsor[];
  athletes: Athlete[];
}) {
  // Sponsor filters
  const [sponsorSearch, setSponsorSearch] = useState<string>('');
  const [industryFilter, setIndustryFilter] = useState<IndustryFilter>('all');
  const [minBudget, setMinBudget] = useState<number>(0);

  // Master-detail selection
  const [selectedSponsorId, setSelectedSponsorId] = useState<string | null>(null);

  // Pitch modal state
  const [pitchSponsor, setPitchSponsor] = useState<Sponsor | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [outreach, setOutreach] = useState<OutreachState>({
    loading: false,
    result: null,
    error: null,
    copied: false,
  });

  const filteredSponsors = useMemo(() => {
    let result = sponsors;

    if (sponsorSearch.trim()) {
      const q = sponsorSearch.toLowerCase().trim();
      result = result.filter((s) => {
        const name = s.business_name.toLowerCase();
        const cat = (s.merchant_category ?? '').toLowerCase();
        const suburb = postcodeToSuburb(s.postcode).toLowerCase();
        const pc = (s.postcode ?? '').toLowerCase();
        return name.includes(q) || cat.includes(q) || suburb.includes(q) || pc.includes(q);
      });
    }

    result = result.filter((s) => matchesIndustry(s.merchant_category, industryFilter));
    result = result.filter((s) => (s.budget_allocation ?? 0) >= minBudget);

    return result;
  }, [sponsors, sponsorSearch, industryFilter, minBudget]);

  const selectedSponsor = useMemo(
    () => sponsors.find((s) => s.id === selectedSponsorId) ?? null,
    [sponsors, selectedSponsorId]
  );

  const matchedAthletes = useMemo(() => {
    if (!selectedSponsor) return [];
    const radiusKm = selectedSponsor.target_radius_meters / 1000;
    return athletes
      .map((a) => ({
        athlete: a,
        distanceKm: haversineKm(
          selectedSponsor.latitude,
          selectedSponsor.longitude,
          a.latitude,
          a.longitude
        ),
      }))
      .filter((m) => m.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [selectedSponsor, athletes]);

  const hasSponsorFilters = sponsorSearch.trim() !== '' || industryFilter !== 'all' || minBudget > 0;

  function clearSponsorFilters() {
    setSponsorSearch('');
    setIndustryFilter('all');
    setMinBudget(0);
  }

  function openPitchModal(sponsor: Sponsor) {
    setPitchSponsor(sponsor);
    setSelectedAthleteId('');
    setOutreach({ loading: false, result: null, error: null, copied: false });
  }

  function closePitchModal() {
    setPitchSponsor(null);
    setSelectedAthleteId('');
    setOutreach({ loading: false, result: null, error: null, copied: false });
  }

  async function handleGenerateOutreach() {
    if (!pitchSponsor || !selectedAthleteId) return;
    const athlete = athletes.find((a) => a.id === selectedAthleteId);
    if (!athlete) return;

    setOutreach({ loading: true, result: null, error: null, copied: false });
    try {
      const res = await generateContractReview({
        athleteName: displayName(athlete?.name),
        sportType: athlete.sport ?? 'athlete',
        sponsorCategory: pitchSponsor.merchant_category ?? 'Sponsorship',
      });
      setOutreach({ loading: false, result: res, error: null, copied: false });
    } catch (e) {
      setOutreach({
        loading: false,
        result: null,
        error: e instanceof Error ? e.message : 'Failed to generate outreach copy',
        copied: false,
      });
    }
  }

  function handleCopyOutreach(text: string) {
    navigator.clipboard?.writeText(text).then(
      () => {
        setOutreach((prev) => ({ ...prev, copied: true }));
        setTimeout(() => setOutreach((prev) => ({ ...prev, copied: false })), 1500);
      },
      () => {}
    );
  }

  const selectedAthlete = athletes.find((a) => a.id === selectedAthleteId);
  const fullCopy = outreach.result
    ? `Subject: ${outreach.result.subject}\n\n${outreach.result.copy}`
    : '';

  return (
    <div className="directory master-detail">
      {/* --- Sponsor Filter Header Bar --- */}
      <div className="sponsor-filter-header">
        <div className="sponsor-filter-head-row">
          <Briefcase size={16} />
          <span>Sponsor Directory</span>
          <span className="sponsor-count-badge">{filteredSponsors.length}</span>
          {hasSponsorFilters && (
            <button className="btn btn-sm btn-ghost" onClick={clearSponsorFilters}>
              <X size={12} /> Clear
            </button>
          )}
        </div>

        <div className="sponsor-filter-controls">
          <div className="sponsor-search-wrap">
            <Search size={14} className="sponsor-search-icon" />
            <input
              type="text"
              className="sponsor-search-input"
              placeholder="Search by sponsor name, category, or location…"
              value={sponsorSearch}
              onChange={(e) => setSponsorSearch(e.target.value)}
            />
          </div>

          <div className="sponsor-industry-wrap">
            <label className="filter-label">Industry</label>
            <div className="industry-select-wrap">
              <select
                className="filter-select"
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value as IndustryFilter)}
              >
                <option value="all">All Industries</option>
                <option value="fitness">Fitness</option>
                <option value="auto">Auto</option>
                <option value="food">Food &amp; Beverage</option>
                <option value="apparel">Apparel</option>
                <option value="physio">Physio</option>
              </select>
              <ChevronDown size={14} className="industry-chevron" />
            </div>
          </div>

          <div className="sponsor-budget-wrap">
            <label className="filter-label">
              Min Budget: {minBudget > 0 ? formatCurrency(minBudget, 'AUD') : 'Any'}
            </label>
            <input
              type="range"
              min={0}
              max={100000}
              step={5000}
              value={minBudget}
              onChange={(e) => setMinBudget(Number(e.target.value))}
              className="radius-slider"
            />
          </div>
        </div>
      </div>

      {/* --- Master-Detail Layout --- */}
      <div className="master-detail-grid">
        {/* LEFT: Sponsor Grid */}
        <div className="master-column">
          <div className="grid">
            {filteredSponsors.map((s) => {
              const isSelected = s.id === selectedSponsorId;
              return (
                <div
                  className={`card sponsor-card ${isSelected ? 'sponsor-card-selected' : ''}`}
                  key={s.id}
                  onClick={() => setSelectedSponsorId(isSelected ? null : s.id)}
                >
                  <div className="card-top">
                    <div className="avatar">
                      <Briefcase size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3>{s.business_name}</h3>
                      <div className="sub">{s.merchant_category ?? 'Uncategorized'}</div>
                    </div>
                    {isSelected && <Crosshair size={16} className="sponsor-selected-icon" />}
                  </div>
                  <div className="card-meta">
                    <span className="badge success">
                      {formatCurrency(s.budget_allocation ?? 0, s.currency)} budget
                    </span>
                    <span className="badge location-tag">
                      <MapPin size={12} /> {postcodeToSuburb(s.postcode)} ·{' '}
                      {(s.target_radius_meters / 1000).toFixed(0)} km reach
                    </span>
                  </div>
                  {s.contact_email && (
                    <div className="sub row" style={{ fontSize: 13 }}>
                      <Mail size={13} /> {s.contact_email}
                    </div>
                  )}
                  <div className="card-actions" style={{ marginTop: 'auto' }}>
                    <button
                      className="btn btn-primary sponsor-pitch-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPitchModal(s);
                      }}
                    >
                      <Send size={14} /> Pitch Sponsor
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredSponsors.length === 0 && (
            <div className="state">
              <Briefcase size={24} style={{ opacity: 0.3 }} />
              <p>No sponsors match these filters. Try adjusting your search or budget criteria.</p>
            </div>
          )}
        </div>

        {/* RIGHT: Sticky Matched Athletes Panel */}
        <aside className="detail-column">
          <div className="detail-panel">
            <div className="detail-panel-head">
              <div className="detail-panel-title">
                <Target size={16} />
                <span>Matched Nearby Athletes</span>
              </div>
              {selectedSponsor && (
                <button
                  className="icon-btn"
                  onClick={() => setSelectedSponsorId(null)}
                  aria-label="Clear selection"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {selectedSponsor ? (
              <>
                <div className="detail-sponsor-info">
                  <div className="detail-sponsor-name">{selectedSponsor.business_name}</div>
                  <div className="detail-sponsor-meta">
                    <span className="badge location-tag">
                      <MapPin size={11} /> {postcodeToSuburb(selectedSponsor.postcode)}
                    </span>
                    <span className="badge">
                      <Target size={11} />{' '}
                      {(selectedSponsor.target_radius_meters / 1000).toFixed(0)} km radius
                    </span>
                    <span className="badge success">
                      {formatCurrency(selectedSponsor.budget_allocation ?? 0, selectedSponsor.currency)}
                    </span>
                  </div>
                </div>

                <div className="detail-athlete-count">
                  {matchedAthletes.length} athlete{matchedAthletes.length === 1 ? '' : 's'} within reach
                </div>

                <div className="detail-athlete-list">
                  {matchedAthletes.map(({ athlete, distanceKm }) => (
                    <div className="detail-athlete-card" key={athlete.id}>
                      <div className="detail-athlete-top">
                        <div className="avatar" style={{ width: 34, height: 34, fontSize: 12 }}>
                          {athleteInitials(athlete?.name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="detail-athlete-name">{displayName(athlete?.name)}</div>
                          <div className="detail-athlete-sub">
                            {athlete.sport ?? '—'}
                            {athlete.current_club ? ` · ${athlete.current_club}` : ''}
                          </div>
                        </div>
                        <span className="badge distance-badge">
                          {distanceKm < 1 ? '<1' : distanceKm.toFixed(1)} km
                        </span>
                      </div>
                      <div className="detail-athlete-meta">
                        {athlete.follower_count != null && (
                          <span className="badge">
                            <Users size={11} /> {athlete.follower_count.toLocaleString()}
                          </span>
                        )}
                        {athlete.postcode && (
                          <span className="badge">
                            <MapPin size={11} /> {postcodeToSuburb(athlete.postcode)}
                          </span>
                        )}
                        {athlete.gender && (
                          <span className="badge accent">{athlete.gender}</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {matchedAthletes.length === 0 && (
                    <div className="detail-empty">
                      <Users size={20} style={{ opacity: 0.3 }} />
                      <p>No registered athletes found within this sponsor's radius.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="detail-placeholder">
                <Crosshair size={32} style={{ opacity: 0.2 }} />
                <p>Select a sponsor card to see all athletes within their reach radius.</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* --- Pitch Sponsor Outreach Modal --- */}
      {pitchSponsor && (
        <>
          <div className="panel-overlay" onClick={closePitchModal} />
          <div
            className="modal pitch-modal"
            role="dialog"
            aria-label={`Pitch to ${pitchSponsor.business_name}`}
          >
            <div className="modal-head">
              <div className="modal-avatar">
                <Send size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h2>Pitch to {pitchSponsor.business_name}</h2>
                <div className="sub">
                  {pitchSponsor.merchant_category ?? 'Uncategorized'}
                  {' · '}
                  {formatCurrency(pitchSponsor.budget_allocation ?? 0, pitchSponsor.currency)} budget
                  {' · '}
                  {postcodeToSuburb(pitchSponsor.postcode)}
                </div>
              </div>
              <button className="icon-btn" onClick={closePitchModal} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="pitch-athlete-select">
                <label className="filter-label">
                  <Users size={14} /> Select Athlete for Outreach
                </label>
                <select
                  className="filter-select"
                  value={selectedAthleteId}
                  onChange={(e) => {
                    setSelectedAthleteId(e.target.value);
                    setOutreach({ loading: false, result: null, error: null, copied: false });
                  }}
                >
                  <option value="">Choose an athlete…</option>
                  {athletes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {displayName(a?.name)} — {a.sport ?? 'athlete'}
                      {a.current_club ? ` (${a.current_club})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAthlete && (
                <div className="pitch-athlete-preview">
                  <div className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                    {athleteInitials(selectedAthlete?.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong>{displayName(selectedAthlete?.name)}</strong>
                    <div className="sub" style={{ fontSize: 12 }}>
                      {selectedAthlete.sport ?? '—'}
                      {selectedAthlete.current_club ? ` · ${selectedAthlete.current_club}` : ''}
                      {selectedAthlete.follower_count != null
                        ? ` · ${selectedAthlete.follower_count.toLocaleString()} followers`
                        : ''}
                    </div>
                  </div>
                </div>
              )}

              <div className="card-actions" style={{ marginTop: 12 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleGenerateOutreach}
                  disabled={!selectedAthleteId || outreach.loading}
                >
                  {outreach.loading ? (
                    <>
                      <Loader2 size={14} className="spin" /> Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> Generate Outreach Copy
                    </>
                  )}
                </button>
              </div>

              {outreach.error && (
                <div style={{ color: 'var(--error)', fontSize: 13, marginTop: 8 }}>
                  {outreach.error}
                </div>
              )}

              {outreach.result && (
                <div className="outreach" style={{ marginTop: 12 }}>
                  <div className="row">
                    <span className="subject">Subject: {outreach.result.subject}</span>
                    <span className="spacer" />
                    {outreach.result.cached && (
                      <span className="cache-hit">⚡ prompt cache hit</span>
                    )}
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => handleCopyOutreach(fullCopy)}
                      aria-label="Copy outreach copy"
                    >
                      {outreach.copied ? <Check size={13} /> : <Copy size={13} />}
                      {outreach.copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre>{outreach.result.copy}</pre>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
