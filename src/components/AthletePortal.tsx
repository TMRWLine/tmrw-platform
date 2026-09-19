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
    <section className="athlete-portal">
      <header className="athlete-portal-head border-grid">
        <div className="athlete-avatar">{athlete?.initials || athleteInitials(name)}</div>
        <div>
          <p className="sponsor-drawer-label">Athlete NIL Portal</p>
          <h1 className="font-serif">{name}</h1>
          <p className="font-mono athlete-portal-meta">
            {sport.toUpperCase()}
            {athlete?.postcode ? ` · ${athlete.postcode}` : ' · BONDI / 2026'}
            {' · '}
            {licenceActive ? 'MASTER LICENCE ACTIVE' : 'LICENCE PENDING'}
          </p>
        </div>
      </header>

      {focus !== 'drops' && (
        <div className="hero-hud font-mono athlete-portal-hud">
          <span>{formatCurrency(pending, 'AUD')} PENDING PAYOUT</span>
          <span>{drops.length} COLLAB DROPS</span>
          <span>70/20/10 SPLIT RAIL</span>
        </div>
      )}

      {focus !== 'drops' && (
        <div className="athlete-portal-block">
          <div className="athlete-portal-block-head">
            <h2>NIL contract status</h2>
          </div>
          <div className="nil-status-grid">
            <article className="nil-status-card border-grid">
              <span className="font-mono">MASTER LICENCE</span>
              <strong>{licenceActive ? 'Executed' : 'Pending signature'}</strong>
              <p>
                {licenceActive
                  ? 'Master licence executed. Statutory amateur safeguards remain on all generated media.'
                  : 'Statutory amateur safeguards remain in force until the master licence is countersigned.'}
              </p>
            </article>
            <article className="nil-status-card border-grid">
              <span className="font-mono">NIL ELIGIBILITY</span>
              <strong>{athlete?.nrl_tpa_registered || athlete?.shute_shield_compliant ? 'Cleared' : 'Under review'}</strong>
              <p>Name, image and likeness usage is scoped to postcode catchments — no club marks in generated media.</p>
            </article>
            <article className="nil-status-card border-grid">
              <span className="font-mono">STRIPE CONNECT</span>
              <strong>Payout rail live</strong>
              <p>Automated RCTIs settle to the athlete ledger on the 70 / 20 / 10 split.</p>
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
          <h2>{focus === 'drops' ? 'Collab Drops pre-order store' : 'Collab Drops'}</h2>
          {focus !== 'drops' && onOpenDrops && (
            <button type="button" className="sponsor-btn-nearby rounded-none" onClick={onOpenDrops}>
              Open store
            </button>
          )}
        </div>
        <ul className="athlete-portal-drops">
          {drops.map((drop) => (
            <li key={drop.id} className="drop-card border-grid">
              <div className="drop-card-meta">
                <span className={`drop-status drop-status-${drop.status}`}>{drop.statusLabel}</span>
                <h3>{drop.title}</h3>
                <div className="drop-price font-mono">A${drop.priceAud}</div>
              </div>
              <div className="drop-split-row">
                <div>
                  <strong className="drop-split-tag drop-split-tag-cyan">{COLLAB_SPLIT.athletePayoutPct}%</strong>
                  <span>Athlete Payout</span>
                </div>
                <div>
                  <strong className="drop-split-tag drop-split-tag-white">{COLLAB_SPLIT.platformFeePct}%</strong>
                  <span>Platform Fee</span>
                </div>
                <div>
                  <strong className="drop-split-tag drop-split-tag-volt">{COLLAB_SPLIT.communityFundPct}%</strong>
                  <span>Grassroots Community Sports Fund</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
