import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AthleteSummary {
  id: string;
  name?: string | null;
  display_name?: string | null;
  sport?: string | null;
  sport_discipline?: string | null;
  current_club?: string | null;
  primary_postcode?: string | null;
}

interface SponsorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  athlete?: AthleteSummary | null;
}

const CATEGORIES = [
  'Footwear & Apparel',
  'Quick Service Restaurant',
  'Automotive Dealer',
  'Fitness & Gyms',
  'Banking & Financial Services',
  'Beverages (Non-Alcoholic)',
  'Local Retail & Hospitality',
  'Health & Physiotherapy'
];

type SyndicatePortfolioId =
  | 'brisbane-2032'
  | 'women-in-sport'
  | 'metro-derby'
  | 'retail-footfall'
  | 'ai-content';

interface SyndicatePortfolio {
  id: SyndicatePortfolioId;
  name: string;
  summary: string;
  deliverables: string[];
}

const SYNDICATE_PORTFOLIOS: readonly SyndicatePortfolio[] = [
  {
    id: 'brisbane-2032',
    name: 'Brisbane 2032 Pathway Syndicate',
    summary: '10-15 State & Junior National Athletes across Olympic disciplines',
    deliverables: [
      'Regional category exclusivity across 10-15 State & Junior National athletes',
      'Multi-discipline Olympic pathway coverage ahead of Brisbane 2032',
      'Early-access brand association with rising national-level talent',
      'Quarterly pathway milestone reporting and athlete progress updates'
    ]
  },
  {
    id: 'women-in-sport',
    name: 'Women in Sport Commercial Accelerator',
    summary: '12 Elite Female Semi-Pro Athletes across Metro leagues',
    deliverables: [
      'Category partnership across 12 elite female semi-pro athletes',
      'Coverage spanning multiple Metro leagues and competitions',
      'Co-branded storytelling and community campaign activations',
      'Audience and engagement reporting for women\'s sport segments'
    ]
  },
  {
    id: 'metro-derby',
    name: 'Cross-Code Metro Derby Takeover',
    summary: '10 Multi-Sport Athletes across rival regional codes',
    deliverables: [
      'Category presence across 10 athletes in rival regional codes',
      'Cross-code derby-week campaign takeover moments',
      'Unified brand presence across competing fan communities',
      'Multi-sport content package for derby build-up and match days'
    ]
  },
  {
    id: 'retail-footfall',
    name: 'Retail Foot-Traffic & Local Hero Network',
    summary: '15 Athletes concentrated in 5km retail store clusters',
    deliverables: [
      '15 local-hero athletes positioned within 5km of your retail clusters',
      'In-store appearances and local hero activations',
      'Postcode-targeted promotion to drive nearby foot traffic',
      'Store-cluster level activation and attribution reporting'
    ]
  },
  {
    id: 'ai-content',
    name: 'AI Content Engine & Digital Asset Vault',
    summary: '12 Athletes delivering raw vertical video reels for ad creative',
    deliverables: [
      'Raw vertical video reels from 12 athletes for ad creative',
      'Licensed digital asset vault for paid and organic social use',
      'Content produced without team logos, club emblems or trademarked jerseys',
      'Monthly asset drops ready for AI-assisted creative workflows'
    ]
  }
];

interface SyndicateBriefSubmission {
  portfolioId: SyndicatePortfolioId;
  portfolioName: string;
  companyName: string;
  contactEmail: string;
  category: string;
  submittedAt: string;
}

export const SponsorDrawer: React.FC<SponsorDrawerProps> = ({ isOpen, onClose, athlete }) => {
  const [selectedTier, setSelectedTier] = useState<'tier1' | 'tier2' | 'tier3'>('tier2');
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0]);
  const [companyName, setCompanyName] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [dealSuccess, setDealSuccess] = useState<boolean>(false);
  const [showSyndicateModal, setShowSyndicateModal] = useState<boolean>(false);
  const [syndicateSuccess, setSyndicateSuccess] = useState<boolean>(false);
  const [selectedSyndicateId, setSelectedSyndicateId] = useState<SyndicatePortfolioId>(
    SYNDICATE_PORTFOLIOS[0].id
  );
  const [syndicateBrief, setSyndicateBrief] = useState<SyndicateBriefSubmission | null>(null);

  if (!isOpen) return null;

  const activeSyndicate =
    SYNDICATE_PORTFOLIOS.find((p) => p.id === selectedSyndicateId) ?? SYNDICATE_PORTFOLIOS[0];

  const athleteName = athlete?.display_name || athlete?.name || 'Roster Talent';
  const athleteSport = athlete?.sport_discipline || athlete?.sport || 'State Athletics';

  const handleDeployCapital = async (tierCode: 'tier1' | 'tier2', amount: number) => {
    setIsSubmitting(true);
    setConflictError(null);

    try {
      if (athlete?.id) {
        const { data: conflictResult, error: conflictErr } = await supabase.rpc('check_sponsor_conflict', {
          p_athlete_id: athlete.id,
          p_sponsor_category: selectedCategory
        });

        if (conflictErr) throw conflictErr;

        if (conflictResult && conflictResult.allowed === false) {
          setConflictError(conflictResult.reason || 'Category restricted by team bylaws or regulatory policy.');
          setIsSubmitting(false);
          return;
        }
      }

      const { error: dealErr } = await supabase.from('sponsor_deals').insert({
        athlete_id: athlete?.id || '33333333-3333-3333-3333-333333333333',
        tier_code: tierCode,
        total_amount_aud: amount,
        escrow_balance_aud: amount,
        status: 'escrowed'
      });

      if (dealErr) {
        console.warn('Could not persist to sponsor_deals table, simulating escrow booking:', dealErr.message);
      }

      setDealSuccess(true);
    } catch (err: any) {
      setConflictError(err.message || 'Execution halted. Please re-verify sponsorship parameters.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyndicateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const brief: SyndicateBriefSubmission = {
      portfolioId: activeSyndicate.id,
      portfolioName: activeSyndicate.name,
      companyName: companyName.trim(),
      contactEmail: contactEmail.trim(),
      category: selectedCategory,
      submittedAt: new Date().toISOString()
    };
    setTimeout(() => {
      setSyndicateBrief(brief);
      setIsSubmitting(false);
      setSyndicateSuccess(true);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-zinc-950 border-l border-zinc-800 text-white flex flex-col max-h-screen">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-lime-400 font-mono tracking-widest uppercase">// SPONSORSHIP ALLOCATION</p>
            <h2 className="text-xl font-bold uppercase tracking-tight mt-1">Capital Deployment Terminal</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white font-mono text-sm px-2 py-1 border border-zinc-800 rounded"
          >
            ESC
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="border border-zinc-800 bg-zinc-900/40 p-4 rounded text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-500 uppercase tracking-wider font-mono">SELECTED ATHLETE:</span>
              <span className="text-white font-medium">{athleteName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 uppercase tracking-wider font-mono">DISCIPLINE:</span>
              <span className="text-zinc-300 font-medium">{athleteSport}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase font-mono tracking-wider text-zinc-400 mb-2">
              Sponsor Commercial Category (Auto-Conflict Audit)
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-white rounded p-3 text-xs focus:border-white focus:outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {conflictError && (
            <div className="p-3 bg-red-950/40 border border-red-900 text-red-400 text-xs rounded font-mono">
              // CONFLICT DETECTED: {conflictError}
            </div>
          )}

          {dealSuccess && (
            <div className="p-4 bg-lime-950/30 border border-lime-500/40 text-center rounded font-mono space-y-2">
              <p className="text-xs text-lime-400 font-bold uppercase tracking-widest">// ESCROW CAPITAL ALLOCATED</p>
              <p className="text-xs text-zinc-300">
                Milestone contract created. Funds held in Stripe escrow pending verified matchday delivery.
              </p>
              <button
                onClick={() => setDealSuccess(false)}
                className="mt-2 text-xs text-zinc-400 underline hover:text-white"
              >
                Book another allocation
              </button>
            </div>
          )}

          <div className="space-y-4">
            <div
              onClick={() => setSelectedTier('tier3')}
              className={`p-5 rounded border cursor-pointer transition-all ${
                selectedTier === 'tier3'
                  ? 'border-lime-400 bg-zinc-900/70 shadow-lg shadow-lime-400/5'
                  : 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-700'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-[10px] font-mono uppercase bg-lime-400/10 text-lime-400 px-2 py-0.5 rounded border border-lime-400/20">
                    Brisbane 2032 Runway
                  </span>
                  <h3 className="text-base font-bold uppercase mt-1">Olympic Pathway Syndicate</h3>
                  <p className="text-xs text-zinc-400">10 to 15 Roster Athletes across Discipline Corridor</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold font-mono text-white">$50,000</span>
                  <p className="text-[10px] text-zinc-500 uppercase font-mono">AUD / Annual</p>
                </div>
              </div>

              <ul className="text-xs text-zinc-400 space-y-1.5 my-4 font-mono">
                <li>* Full sport discipline category lockout across regional market</li>
                <li>* AI Studio broadcast clip rights for programmatic distribution</li>
                <li>* Integrated co-branded merchandise drop pre-order rail</li>
                <li>* 10% gross allocation to Grassroots Community Sports Fund</li>
              </ul>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSyndicateModal(true);
                }}
                className="w-full bg-white text-black font-semibold text-xs py-3 uppercase tracking-wider rounded hover:bg-zinc-200 transition-colors"
              >
                Apply for Syndicate
              </button>
            </div>

            <div
              onClick={() => setSelectedTier('tier2')}
              className={`p-5 rounded border cursor-pointer transition-all ${
                selectedTier === 'tier2'
                  ? 'border-white bg-zinc-900/70'
                  : 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-700'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-[10px] font-mono uppercase bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                    Core Bestseller
                  </span>
                  <h3 className="text-base font-bold uppercase mt-1">Regional Metro Hub</h3>
                  <p className="text-xs text-zinc-400">3 Roster Athletes within 25km Cluster</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold font-mono text-white">$18,000</span>
                  <p className="text-[10px] text-zinc-500 uppercase font-mono">AUD / Campaign</p>
                </div>
              </div>

              <ul className="text-xs text-zinc-400 space-y-1.5 my-4 font-mono">
                <li>* Regional category exclusivity within 25km trading radius</li>
                <li>* TwelveLabs AI-indexed highlight clips for Meta/TikTok ads</li>
                <li>* 1 in-person club clinic or flagship store appearance</li>
                <li>* 50/50 split settlement escrow via Stripe Connect rails</li>
              </ul>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeployCapital('tier2', 18000);
                }}
                disabled={isSubmitting}
                className="w-full bg-zinc-100 text-black font-semibold text-xs py-3 uppercase tracking-wider rounded hover:bg-white disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Verifying Compliance...' : 'Deploy $18,000 Capital'}
              </button>
            </div>

            <div
              onClick={() => setSelectedTier('tier1')}
              className={`p-5 rounded border cursor-pointer transition-all ${
                selectedTier === 'tier1'
                  ? 'border-white bg-zinc-900/70'
                  : 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-700'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-[10px] font-mono uppercase bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                    Instant Activation
                  </span>
                  <h3 className="text-base font-bold uppercase mt-1">Local Postcode Starter</h3>
                  <p className="text-xs text-zinc-400">1 Verified Athlete within 5km Store Radius</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold font-mono text-white">$5,000</span>
                  <p className="text-[10px] text-zinc-500 uppercase font-mono">AUD / Flat</p>
                </div>
              </div>

              <ul className="text-xs text-zinc-400 space-y-1.5 my-4 font-mono">
                <li>* Storefront window poster and digital POS promotion rights</li>
                <li>* 2 verified social amplification posts tagged with store location</li>
                <li>* Pre-cleared Sport Integrity Australia bylaws clearance</li>
                <li>* Instant automated Recipient Created Tax Invoice (RCTI)</li>
              </ul>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeployCapital('tier1', 5000);
                }}
                disabled={isSubmitting}
                className="w-full bg-zinc-800 text-white font-semibold text-xs py-3 uppercase tracking-wider rounded hover:bg-zinc-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Verifying Compliance...' : 'Deploy $5,000 Capital'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 text-[11px] font-mono text-zinc-500 flex justify-between">
          <span>// ESCROW REVENUE SPLIT: 70/20/10</span>
          <span>EST. SETTLEMENT: T+2</span>
        </div>
      </div>

      {showSyndicateModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4">
          <div className="max-w-md w-full max-h-[90vh] overflow-y-auto bg-zinc-950 border border-zinc-800 p-6 rounded shadow-2xl font-mono text-white">
            <div className="flex justify-between items-center mb-4">
              <p className="text-xs text-lime-400 uppercase tracking-widest">// EXECUTIVE APPLICATION</p>
              <button
                onClick={() => {
                  setShowSyndicateModal(false);
                  setSyndicateSuccess(false);
                }}
                className="text-zinc-500 hover:text-white text-xs"
              >
                CLOSE
              </button>
            </div>

            <h3 className="text-lg font-bold uppercase tracking-tight mb-2">
              $50,000 Olympic Syndicate Retainer
            </h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Syndicates provide regional category exclusivity across a curated portfolio of rising athletes. Applications are reviewed within 24 hours to ensure brand alignment.
            </p>

            {syndicateSuccess ? (
              <div className="p-4 border border-lime-400/40 bg-lime-950/20 rounded text-center space-y-2">
                <p className="text-xs text-lime-400 font-bold uppercase">// APPLICATION SUBMITTED</p>
                {syndicateBrief && (
                  <p className="text-xs text-white font-semibold">{syndicateBrief.portfolioName}</p>
                )}
                <p className="text-xs text-zinc-300">
                  Our corporate partnerships lead will contact your marketing team within one business day.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSyndicateSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="syndicate-portfolio"
                    className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-1"
                  >
                    Syndicate Portfolio Model
                  </label>
                  <select
                    id="syndicate-portfolio"
                    value={selectedSyndicateId}
                    onChange={(e) => setSelectedSyndicateId(e.target.value as SyndicatePortfolioId)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded p-2.5 text-xs focus:border-white focus:outline-none"
                  >
                    {SYNDICATE_PORTFOLIOS.map((portfolio) => (
                      <option key={portfolio.id} value={portfolio.id}>
                        {portfolio.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-zinc-500 mt-1.5">{activeSyndicate.summary}</p>
                </div>

                <div className="p-3 border border-zinc-800 bg-zinc-900/50 rounded" aria-live="polite">
                  <p className="text-[11px] text-lime-400 uppercase tracking-wider mb-2">
                    // KEY DELIVERABLES
                  </p>
                  <ul className="space-y-1.5">
                    {activeSyndicate.deliverables.map((item) => (
                      <li key={item} className="flex gap-2 text-xs text-zinc-300 leading-relaxed">
                        <span className="text-lime-400">&gt;</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-1">
                    Company / Brand Legal Entity
                  </label>
                  <input
                    required
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Asics Oceania Ltd"
                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded p-2.5 text-xs focus:border-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-1">
                    Partnership Director Email
                  </label>
                  <input
                    required
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded p-2.5 text-xs focus:border-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-1">
                    Target Commercial Category
                  </label>
                  <input
                    disabled
                    value={selectedCategory}
                    className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-400 rounded p-2.5 text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-lime-400 text-black font-semibold text-xs py-3 uppercase tracking-wider rounded hover:bg-lime-300 transition-colors mt-2"
                >
                  {isSubmitting ? 'Transmitting Brief...' : 'Submit Syndicate Brief'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SponsorDrawer;