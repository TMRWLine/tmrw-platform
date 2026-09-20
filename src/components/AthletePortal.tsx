import { COLLAB_SPLIT, HUNTER_BLIGH_COLLAB_DROPS, type Athlete, type CollabDrop } from '../types';
import { athleteDisplayName, athleteInitials } from '../lib/formatName';
import { formatCurrency } from '../api';
import { StatementsPanel } from './StatementsPanel';

export function AthletePortal({
  athlete,
  focus = 'overview',
  onOpenDrops,
}: {
  athlete?: Athlete | null;
  focus?: 'overview' | 'drops';
  onOpenDrops?: () => void;
}) {
  const name = athlete ? athleteDisplayName(athlete) : 'Hunter Bligh';
  const sport = athlete?.sport ?? 'Rugby Union';
  const drops: CollabDrop[] = HUNTER_BLIGH_COLLAB_DROPS;
  const pending = drops.reduce((sum, d) => sum + d.priceAud * d.batchSize * (COLLAB_SPLIT.athletePayoutPct / 100), 0);
  const merchGross = drops.reduce((sum, d) => sum + d.priceAud * d.batchSize, 0);
  const licenceActive = Boolean(athlete?.master_licence_signed);

  return (
    <section className="athlete-portal bg-transparent">
      <header className="athlete-portal-head border border-white/10 bg-white/[0.02] backdrop-blur-md p-6">
        <div className="athlete-avatar">{athlete?.initials || athleteInitials(name)}</div>
        <div>
          <p className="font-mono text-[11px] tracking-widest uppercase text-[#D2FF00] mb-2">
            // ATHLETE NIL PORTAL
          </p>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white mt-0">{name}</h1>
          <p className="font-mono text-[11px] tracking-widest text-zinc-400 mt-2">
            {sport.toUpperCase()}
            {athlete?.postcode ? ` · ${athlete.postcode}` : ' · BONDI / 2026'}
            {' · '}
            {licenceActive ? 'MASTER LICENCE ACTIVE' : 'LICENCE PENDING'}
          </p>
        </div>
      </header>

      {focus !== 'drops' && (
        <div className="flex flex-wrap gap-3">
          <span className="border border-white/10 bg-white/[0.02] font-mono text-xs text-[#D2FF00] px-4 py-2">
            {formatCurrency(pending, 'AUD')} PENDING PAYOUT
          </span>
          <span className="border border-white/10 bg-white/[0.02] font-mono text-xs text-[#D2FF00] px-4 py-2">
            {drops.length} COLLAB DROPS
          </span>
          <span className="border border-white/10 bg-white/[0.02] font-mono text-xs text-[#D2FF00] px-4 py-2">
            70/20/10 SPLIT RAIL
          </span>
        </div>
      )}

      {focus !== 'drops' && (
        <div className="athlete-portal-block">
          <div className="athlete-portal-block-head">
            <h2 className="text-white font-black uppercase tracking-tight text-lg">NIL contract status</h2>
          </div>
          <div className="nil-status-grid">
            <article className="nil-status-card border border-white/10 bg-white/[0.02] backdrop-blur-md">
              <span className="font-mono text-[10px] tracking-widest text-zinc-500">MASTER LICENCE</span>
              <strong className="text-white">{licenceActive ? 'Executed' : 'Pending signature'}</strong>
              <p className="text-zinc-400">
                {licenceActive
                  ? 'Master licence executed. Statutory amateur safeguards remain on all generated media.'
                  : 'Statutory amateur safeguards remain in force until the master licence is countersigned.'}
              </p>
            </article>
            <article className="nil-status-card border border-white/10 bg-white/[0.02] backdrop-blur-md">
              <span className="font-mono text-[10px] tracking-widest text-zinc-500">NIL ELIGIBILITY</span>
              <strong className="text-white">
                {athlete?.nrl_tpa_registered || athlete?.shute_shield_compliant ? 'Cleared' : 'Under review'}
              </strong>
              <p className="text-zinc-400">
                Name, image and likeness usage is scoped to postcode catchments — no club marks in generated media.
              </p>
            </article>
            <article className="nil-status-card border border-white/10 bg-white/[0.02] backdrop-blur-md">
              <span className="font-mono text-[10px] tracking-widest text-zinc-500">STRIPE CONNECT</span>
              <strong className="text-white">Payout rail live</strong>
              <p className="text-zinc-400">Automated RCTIs settle to the athlete ledger on the 70 / 20 / 10 split.</p>
            </article>
          </div>
        </div>
      )}

      {focus !== 'drops' && (
        <StatementsPanel
          grossExGst={Math.round(merchGross)}
          currency="AUD"
          athleteName={name}
          startDate={null}
          endDate={null}
        />
      )}

      <div className="athlete-portal-block">
        <div className="athlete-portal-block-head">
          <h2 className="text-white font-black uppercase tracking-tight text-lg">
            {focus === 'drops' ? 'Collab Drops pre-order store' : 'Collab Drops'}
          </h2>
          {focus !== 'drops' && onOpenDrops && (
            <button
              type="button"
              className="border border-white/10 bg-white/[0.02] font-mono text-xs text-[#D2FF00] px-4 py-2 cursor-pointer"
              onClick={onOpenDrops}
            >
              OPEN STORE
            </button>
          )}
        </div>
        <ul className="athlete-portal-drops">
          {drops.map((drop) => (
            <li key={drop.id} className="drop-card border border-white/10 bg-white/[0.02] backdrop-blur-md p-5">
              <div className="drop-card-meta">
                <span className={`drop-status drop-status-${drop.status}`}>{drop.statusLabel}</span>
                <h3 className="text-white">{drop.title}</h3>
                <div className="drop-price font-mono text-white">A${drop.priceAud}</div>
              </div>
              <div className="drop-split-row">
                <div>
                  <strong className="drop-split-tag drop-split-tag-cyan">{COLLAB_SPLIT.athletePayoutPct}%</strong>
                  <span className="text-zinc-400">Athlete Payout</span>
                </div>
                <div>
                  <strong className="drop-split-tag drop-split-tag-white">{COLLAB_SPLIT.platformFeePct}%</strong>
                  <span className="text-zinc-400">Platform Fee</span>
                </div>
                <div>
                  <strong className="drop-split-tag drop-split-tag-volt">{COLLAB_SPLIT.communityFundPct}%</strong>
                  <span className="text-zinc-400">Grassroots Community Sports Fund</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
