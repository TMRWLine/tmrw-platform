import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Plus, Loader2, MapPin, DollarSign, Target, Send, AlertCircle, X } from 'lucide-react';
import type { Athlete, Campaign, CampaignApplication, Sponsor } from '../types';
import { fetchCampaigns, createCampaign, fetchApplications, applyToCampaign } from '../api';
import { formatCurrency } from '../api';
import { displayName } from '../lib/formatName';

export function CampaignHub({
  athletes,
  sponsors,
}: {
  athletes: Athlete[];
  sponsors: Sponsor[];
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [formSponsorId, setFormSponsorId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formBudget, setFormBudget] = useState('');
  const [formRadius, setFormRadius] = useState('');
  const [formSport, setFormSport] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Application state per campaign
  const [apps, setApps] = useState<Record<string, CampaignApplication[]>>({});
  const [applyingAthlete, setApplyingAthlete] = useState<string | null>(null);
  const [applyingCampaign, setApplyingCampaign] = useState<string | null>(null);
  const [pitch, setPitch] = useState('');
  const [applyError, setApplyError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchCampaigns();
      setCampaigns(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    campaigns.forEach((c) => {
      fetchApplications(c.id)
        .then((rows) => setApps((prev) => ({ ...prev, [c.id]: rows })))
        .catch(() => {});
    });
  }, [campaigns]);

  async function handleCreate() {
    if (!formSponsorId || !formTitle.trim() || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const campaign = await createCampaign({
        sponsor_id: formSponsorId,
        title: formTitle.trim(),
        description: formDesc.trim() || null,
        budget_aud: formBudget ? Number(formBudget) : null,
        radius_km: formRadius ? Number(formRadius) : null,
        sport_category: formSport.trim() || null,
        status: 'active',
      });
      setCampaigns((prev) => [campaign, ...prev]);
      setShowCreate(false);
      setFormSponsorId('');
      setFormTitle('');
      setFormDesc('');
      setFormBudget('');
      setFormRadius('');
      setFormSport('');
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  }

  async function handleApply() {
    if (!applyingCampaign || !applyingAthlete || !pitch.trim()) return;
    setApplyError(null);
    try {
      const app = await applyToCampaign(applyingCampaign, applyingAthlete, pitch.trim());
      setApps((prev) => ({
        ...prev,
        [applyingCampaign]: [app, ...(prev[applyingCampaign] ?? [])],
      }));
      setApplyingCampaign(null);
      setApplyingAthlete(null);
      setPitch('');
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : 'Failed to apply');
    }
  }

  const sports = Array.from(new Set(athletes.map((a) => a.sport).filter(Boolean))) as string[];

  return (
    <div className="campaign-hub">
      <div className="campaign-head">
        <div>
          <h2>Campaign Hub</h2>
          <p className="sub">Sponsors post open briefs. Athletes apply based on postcode proximity.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> Post Campaign Brief
        </button>
      </div>

      {loading && (
        <div className="state">
          <Loader2 size={20} className="spin" /> Loading campaigns…
        </div>
      )}
      {error && (
        <div className="state">
          <AlertCircle size={20} style={{ color: 'var(--error)' }} />
          <p>{error}</p>
          <button className="btn" onClick={load}>Retry</button>
        </div>
      )}

      {!loading && !error && campaigns.length === 0 && (
        <div className="state">
          <Megaphone size={24} style={{ opacity: 0.3 }} />
          <p>No campaigns yet. Sponsors can post open briefs for athletes to apply.</p>
        </div>
      )}

      <div className="grid">
        {campaigns.filter(Boolean).map((c) => {
          const sponsor = sponsors.find((s) => s.id === c.sponsor_id);
          const campaignApps = apps[c.id] ?? [];
          return (
            <div className="card campaign-card" key={c.id ?? c.title}>
              <div className="card-top">
                <div className="avatar">
                  <Megaphone size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3>{c.title ?? 'Untitled campaign'}</h3>
                  <div className="sub">{sponsor?.business_name ?? 'Unknown sponsor'}</div>
                </div>
                <span className={`badge ${c.status === 'active' ? 'success' : ''}`}>{c.status ?? 'draft'}</span>
              </div>

              {c.description && <p className="campaign-desc">{c.description}</p>}

              <div className="card-meta">
                {c.budget_aud != null && (
                  <span className="badge success"><DollarSign size={12} /> {formatCurrency(c.budget_aud, 'AUD')}</span>
                )}
                {c.radius_km != null && (
                  <span className="badge"><MapPin size={12} /> {c.radius_km} km radius</span>
                )}
                {c.sport_category && (
                  <span className="badge accent"><Target size={12} /> {c.sport_category}</span>
                )}
              </div>

              {campaignApps.length > 0 && (
                <div className="campaign-apps">
                  <span className="sub" style={{ fontSize: 12 }}>
                    {campaignApps.length} application{campaignApps.length !== 1 ? 's' : ''}
                  </span>
                  {campaignApps.slice(0, 3).map((app) => {
                    const athlete = athletes.find((a) => a.id === app.athlete_id);
                    return (
                      <div key={app.id} className="campaign-app-row">
                        <span>{displayName(athlete?.name, 'Unknown athlete')}</span>
                        <span className={`badge ${app.status === 'accepted' ? 'success' : app.status === 'declined' ? '' : 'accent'}`}>
                          {app.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="card-actions">
                <select
                  className="filter-select"
                  value={applyingCampaign === c.id ? (applyingAthlete ?? '') : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setApplyingCampaign(c.id);
                      setApplyingAthlete(e.target.value);
                      setApplyError(null);
                    }
                  }}
                >
                  <option value="">Apply as…</option>
                  {athletes.map((a) => (
                    <option key={a.id} value={a.id}>{displayName(a?.name)}</option>
                  ))}
                </select>
              </div>

              {applyingCampaign === c.id && applyingAthlete && (
                <div className="apply-form">
                  <textarea
                    className="msg-input"
                    placeholder="Write your pitch…"
                    value={pitch}
                    onChange={(e) => setPitch(e.target.value)}
                    rows={2}
                  />
                  {applyError && <div className="msg-error"><AlertCircle size={13} /> {applyError}</div>}
                  <div className="card-actions">
                    <button className="btn btn-sm" onClick={() => { setApplyingCampaign(null); setApplyingAthlete(null); setPitch(''); }}>
                      Cancel
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleApply} disabled={!pitch.trim()}>
                      <Send size={13} /> Submit Application
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal campaign-create-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-avatar">
                <Megaphone size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h2>Post Campaign Brief</h2>
                <div className="sub">Create an open brief for athletes to apply</div>
              </div>
              <button className="icon-btn" onClick={() => setShowCreate(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="create-form">
                <label className="filter-label">Sponsor</label>
                <select className="filter-select" value={formSponsorId} onChange={(e) => setFormSponsorId(e.target.value)}>
                  <option value="">Select a sponsor…</option>
                  {sponsors.map((s) => (
                    <option key={s.id} value={s.id}>{s.business_name}</option>
                  ))}
                </select>

                <label className="filter-label">Campaign Title</label>
                <input className="sign-input" placeholder="e.g. Summer Rugby Series Sponsorship" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />

                <label className="filter-label">Description</label>
                <textarea className="msg-input" placeholder="Describe what you're looking for…" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={3} />

                <div className="filter-grid">
                  <div>
                    <label className="filter-label">Budget (AUD)</label>
                    <input className="sign-input" type="number" placeholder="50000" value={formBudget} onChange={(e) => setFormBudget(e.target.value)} />
                  </div>
                  <div>
                    <label className="filter-label">Radius (km)</label>
                    <input className="sign-input" type="number" placeholder="50" value={formRadius} onChange={(e) => setFormRadius(e.target.value)} />
                  </div>
                  <div>
                    <label className="filter-label">Sport Category</label>
                    <select className="filter-select" value={formSport} onChange={(e) => setFormSport(e.target.value)}>
                      <option value="">Any sport</option>
                      {sports.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {createError && <div className="msg-error"><AlertCircle size={13} /> {createError}</div>}

                <div className="card-actions" style={{ marginTop: 12 }}>
                  <button className="btn" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleCreate} disabled={!formSponsorId || !formTitle.trim() || creating}>
                    {creating ? <><Loader2 size={14} className="spin" /> Posting…</> : <><Plus size={14} /> Post Brief</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
