import React, { useEffect, useId, useState } from 'react';

type SyndicatePortfolioId = 'brisbane-2032' | 'women-in-sport' | 'metro-derby' | 'retail-footfall';

interface SyndicatePortfolio {
  id: SyndicatePortfolioId;
  name: string;
  summary: string;
}

const PORTFOLIOS: readonly SyndicatePortfolio[] = [
  {
    id: 'brisbane-2032',
    name: 'Brisbane 2032 Pathway Syndicate',
    summary: 'Olympic-pathway coverage from A$25000 to A$50000, settled on the 70/15/15 split.',
  },
  {
    id: 'women-in-sport',
    name: 'Women in Sport Commercial Accelerator',
    summary: 'Category partnership across elite female pathway athletes.',
  },
  {
    id: 'metro-derby',
    name: 'Cross-Code Metro Derby Takeover',
    summary: 'Multi-sport athletes across rival regional codes.',
  },
  {
    id: 'retail-footfall',
    name: 'Retail Foot-Traffic & Local Hero Network',
    summary: 'Local-hero athletes inside a 5km retail cluster, including contra.',
  },
];

const FIELD_LABEL = 'font-mono text-[9px] tracking-[0.2em] text-[#666666] uppercase block mb-2';
const FIELD_INPUT =
  'w-full bg-white border border-[#080808]/15 rounded-xl px-4 py-3 text-sm text-[#080808] placeholder-[#999999] outline-none focus:border-[#080808]';

interface SyndicateEnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyndicateEnquiryModal: React.FC<SyndicateEnquiryModalProps> = ({ isOpen, onClose }) => {
  const titleId = useId();
  const [portfolioId, setPortfolioId] = useState<SyndicatePortfolioId>('brisbane-2032');
  const [companyName, setCompanyName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const portfolio = PORTFOLIOS.find((item) => item.id === portfolioId) ?? PORTFOLIOS[0];

  useEffect(() => {
    if (isOpen) return;
    setPortfolioId('brisbane-2032');
    setCompanyName('');
    setContactEmail('');
    setSubmitting(false);
    setSubmitted(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close syndicate enquiry"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-md border-0 p-0 cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[24px] bg-[#F7F7F6] border border-[#080808]/10 shadow-2xl p-6 md:p-8"
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="m-0 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">
              Brisbane 2032 Runway
            </p>
            <h2 id={titleId} className="m-0 mt-2 font-display font-extrabold text-3xl tracking-tight text-[#080808]">
              Corporate & Syndicate Packages
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-transparent border-0 text-[#666666] hover:text-[#080808] cursor-pointer"
          >
            ×
          </button>
        </div>

        <p className="m-0 mb-6 text-sm leading-relaxed text-[#555555]">
          Tell us the catchment you want to own. Syndicates are reviewed for category fit, then cleared on the 70/15/15 split before the whistle.
        </p>

        {submitted ? (
          <div className="rounded-2xl border border-[#080808]/10 bg-white p-5">
            <p className="m-0 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#080808]">
              Enquiry received
            </p>
            <p className="m-0 mt-2 text-sm text-[#555555] leading-relaxed">
              {portfolio.name} for {companyName.trim()}. A partnerships lead will reply within one business day.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="syndicate-portfolio" className={FIELD_LABEL}>
                Syndicate package
              </label>
              <select
                id="syndicate-portfolio"
                value={portfolioId}
                onChange={(event) => setPortfolioId(event.target.value as SyndicatePortfolioId)}
                className={FIELD_INPUT}
              >
                {PORTFOLIOS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <p className="m-0 mt-2 text-xs leading-relaxed text-[#666666]">{portfolio.summary}</p>
            </div>
            <div>
              <label htmlFor="syndicate-company" className={FIELD_LABEL}>
                Company / brand
              </label>
              <input
                id="syndicate-company"
                required
                type="text"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Peninsula Motor Group"
                className={FIELD_INPUT}
              />
            </div>
            <div>
              <label htmlFor="syndicate-email" className={FIELD_LABEL}>
                Partnership email
              </label>
              <input
                id="syndicate-email"
                required
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="name@company.com"
                className={FIELD_INPUT}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#080808] text-[#F7F7F6] font-bold text-xs uppercase tracking-widest py-3.5 border-0 cursor-pointer hover:bg-[#B8FF00] hover:text-[#080808] transition-colors disabled:opacity-50"
            >
              {submitting ? 'Sending enquiry…' : 'Submit syndicate enquiry'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default SyndicateEnquiryModal;
