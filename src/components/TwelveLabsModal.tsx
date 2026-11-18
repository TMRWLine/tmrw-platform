import { useRef, useState } from 'react';
import {
  X,
  Film,
  Search,
  Play,
  Loader2,
  Download,
  Clapperboard,
  Clock,
  Eye,
  Image as ImageIcon,
} from 'lucide-react';
import type { Athlete } from '../types';
import { displayName } from '../lib/formatName';
import { generateMockEvents } from '../lib/twelvelabs';
import { withTimeout } from '../lib/spatial';
import {
  generateAthleteHighlights,
  searchSponsorExposures,
  formatDuration,
  type HighlightClip,
  type SponsorExposureResult,
} from '../services/twelveLabs';

function demoClips(athlete: Athlete): HighlightClip[] {
  return generateMockEvents(athlete).slice(0, 3).map((event, index) => ({
    id: `demo-${index}`, title: event.text.replace(/\u2014/g, '·'), action: event.type,
    startSec: event.start, endSec: event.end, durationSec: event.end - event.start,
    aspectRatio: '9:16', thumbnailGradient: '#080808',
    sponsorWatermark: 'Demo · sample footage', downloadUrl: '#', confidence: event.confidence,
  }));
}

type Tab = 'highlights' | 'search';

export function TwelveLabsModal({
  athletes,
  preselectedAthlete,
  onClose,
}: {
  athletes: Athlete[];
  preselectedAthlete?: Athlete | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('highlights');

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <div className="modal tl-modal" role="dialog" aria-label="AI Media Studio">
        <div className="modal-head">
          <div className="modal-avatar">
            <Clapperboard size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h2>AI Media Studio</h2>
            <div className="sub">TwelveLabs Video Intelligence · Highlight Reels &amp; Brand Audit</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <p role="status" style={{ padding: '0 24px', color: '#080808', background: '#F7F7F6' }}>Demo mode · sample highlights and sponsor exposure data. No live TwelveLabs request is made.</p>

        <div className="modal-tabs">
          <button className={tab === 'highlights' ? 'active' : ''} onClick={() => setTab('highlights')}>
            <Film size={13} style={{ marginRight: 5, verticalAlign: '-2px' }} />
            AI Highlight Generator
          </button>
          <button className={tab === 'search' ? 'active' : ''} onClick={() => setTab('search')}>
            <Search size={13} style={{ marginRight: 5, verticalAlign: '-2px' }} />
            Semantic Sponsor Search
          </button>
        </div>

        <div className="modal-body">
          {tab === 'highlights' && (
            <HighlightTab athletes={athletes} preselectedAthlete={preselectedAthlete} />
          )}
          {tab === 'search' && <SearchTab />}
        </div>
      </div>
    </>
  );
}

/* ---------- Tab 1: AI Highlight Generator ---------- */

function HighlightTab({
  athletes,
  preselectedAthlete,
}: {
  athletes: Athlete[];
  preselectedAthlete?: Athlete | null;
}) {
  const [selectedId, setSelectedId] = useState(preselectedAthlete?.id ?? '');
  const [generating, setGenerating] = useState(false);
  const [clips, setClips] = useState<HighlightClip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const videoIdRef = useRef(`vid-${Date.now()}`);

  const roster =
    preselectedAthlete && !athletes.some((athlete) => athlete.id === preselectedAthlete.id)
      ? [preselectedAthlete, ...athletes]
      : athletes;
  const selected = roster.find((a) => a.id === selectedId) ?? null;

  async function handleGenerate() {
    if (!selected || generating) return;
    setGenerating(true);
    setError(null);
    setClips([]);
    try {
      const result = await withTimeout(generateAthleteHighlights(videoIdRef.current, selected));
      setClips(result);
    } catch {
      setClips(demoClips(selected));
      setError('Generation unavailable or timed out · showing sample highlights.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="tl-tab">
      <div className="tl-controls">
        <div style={{ flex: 1 }}>
          <label className="filter-label">Select Athlete</label>
          <select
            className="filter-select"
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setClips([]);
            }}
            disabled={generating}
          >
            <option value="">Choose an athlete…</option>
            {roster.map((a) => (
              <option key={a.id} value={a.id}>
                {displayName(a?.name)} · {a.sport ?? 'athlete'}
              </option>
            ))}
          </select>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={!selected || generating}
          style={{ alignSelf: 'flex-end' }}
        >
          {generating ? (
            <><Loader2 size={14} className="spin" /> Generating…</>
          ) : (
            <><Play size={14} /> Generate AI Reels</>
          )}
        </button>
      </div>

      {error && <div role="status" style={{ color: '#080808', background: '#F7F7F6', padding: 12 }}>{error}</div>}

      {generating && (
        <div className="tl-generating">
          <div className="spinner" />
          <p>Analysing match footage with TwelveLabs Marengo 2.7…</p>
          <p className="sub">Detecting key plays, extracting 9:16 vertical clips, applying sponsor watermarks</p>
        </div>
      )}

      {!generating && clips.length > 0 && (
        <div className="tl-clips-grid">
          {clips.map((clip) => (
            <div className="tl-clip-card" key={clip.id}>
              <div className="tl-clip-thumb" style={{ background: '#080808' }}>
                <div className="tl-clip-play">
                  <Play size={24} fill="#F7F7F6" />
                </div>
                <div className="tl-clip-watermark">{clip.sponsorWatermark}</div>
                <div className="tl-clip-action-badge">{clip.action}</div>
                <div className="tl-clip-duration">{formatDuration(clip.durationSec)}</div>
              </div>
              <div className="tl-clip-body">
                <div className="tl-clip-title">{clip.title.replace(/\u2014/g, '·')}</div>
                <div className="tl-clip-meta">
                  <span className="badge accent">
                    <Clock size={11} /> {formatDuration(clip.startSec)} – {formatDuration(clip.endSec)}
                  </span>
                  <span className="badge">
                    <Eye size={11} /> {Math.round(clip.confidence * 100)}%
                  </span>
                </div>
                <button className="btn btn-sm tl-download" disabled>
                  <Download size={12} /> Sample · no media download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!generating && clips.length === 0 && !error && (
        <div className="tl-empty">
          <Clapperboard size={32} style={{ opacity: 0.25 }} />
          <p>Select an athlete and click "Generate AI Reels" to create vertical highlight clips.</p>
        </div>
      )}
    </div>
  );
}

/* ---------- Tab 2: Semantic Sponsor Search ---------- */

function SearchTab() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<SponsorExposureResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  async function handleSearch() {
    if (!query.trim() || searching) return;
    setSearching(true);
    setError(null);
    setResult(null);
    try {
      const res = await withTimeout(searchSponsorExposures(query.trim()));
      setResult(res);
      setActiveIdx(0);
    } catch {
      setResult({
        brandName: query.trim(), videoDurationSec: 3600, totalExposureSec: 12,
        exposures: [{ id: 'demo-exposure', timestamp: '4:12', startSec: 252, durationSec: 12,
          context: 'Sample sponsor banner appearance', visibilityScore: 0.8 }],
      });
      setActiveIdx(0);
      setError('Search unavailable or timed out · showing sample exposure data.');
    } finally {
      setSearching(false);
    }
  }

  const activeExposure = result?.exposures[activeIdx] ?? null;
  const progressPct = activeExposure
    ? Math.min((activeExposure.startSec / result!.videoDurationSec) * 100, 100)
    : 0;

  return (
    <div className="tl-tab">
      <div className="tl-controls">
        <div style={{ flex: 1 }}>
          <label className="filter-label">Natural Language Search</label>
          <input
            className="sign-input"
            placeholder="e.g. Find all high-impact plays with sponsor banner"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            disabled={searching}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSearch}
          disabled={!query.trim() || searching}
          style={{ alignSelf: 'flex-end' }}
        >
          {searching ? (
            <><Loader2 size={14} className="spin" /> Searching…</>
          ) : (
            <><Search size={14} /> Search</>
          )}
        </button>
      </div>

      {error && <div role="status" style={{ color: '#080808', background: '#F7F7F6', padding: 12 }}>{error}</div>}

      {searching && (
        <div className="tl-generating">
          <div className="spinner" />
          <p>Querying TwelveLabs semantic index…</p>
        </div>
      )}

      {!searching && result && (
        <div className="tl-search-results">
          {/* Exposure metrics */}
          <div className="tl-exposure-metrics">
            <div className="tl-metric">
              <span className="tl-metric-value">{result.exposures.length}</span>
              <span className="tl-metric-label">Appearances</span>
            </div>
            <div className="tl-metric">
              <span className="tl-metric-value">{formatDuration(result.totalExposureSec)}</span>
              <span className="tl-metric-label">Total Exposure</span>
            </div>
            <div className="tl-metric">
              <span className="tl-metric-value">{result.brandName}</span>
              <span className="tl-metric-label">Brand</span>
            </div>
          </div>

          {/* Timestamp scrubber */}
          <div className="tl-scrubber-section">
            <div className="tl-scrubber-label">Video Timeline Scrubber</div>
            <div className="tl-scrubber">
              <div className="tl-scrubber-track">
                {result.exposures.map((exp, i) => {
                  const left = (exp.startSec / result.videoDurationSec) * 100;
                  const width = Math.max((exp.durationSec / result.videoDurationSec) * 100, 1.5);
                  return (
                    <div
                      key={exp.id}
                      className={`tl-scrubber-marker ${i === activeIdx ? 'active' : ''}`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      onClick={() => setActiveIdx(i)}
                      title={`${exp.timestamp} · ${exp.context}`}
                    />
                  );
                })}
                <div className="tl-scrubber-playhead" style={{ left: `${progressPct}%` }} />
              </div>
              <div className="tl-scrubber-time">
                <span>{activeExposure ? formatDuration(activeExposure.startSec) : '0:00'}</span>
                <span>{formatDuration(result.videoDurationSec)}</span>
              </div>
            </div>
          </div>

          {/* Active exposure detail */}
          {activeExposure && (
            <div className="tl-exposure-detail">
              <div className="tl-exposure-detail-head">
                <ImageIcon size={16} />
                <span>{activeExposure.context}</span>
              </div>
              <div className="tl-exposure-badges">
                <span className="badge accent">
                  <Clock size={11} /> {activeExposure.timestamp}
                </span>
                <span className="badge">
                  Duration {activeExposure.durationSec}s
                </span>
                <span className="badge">
                  <Eye size={11} /> {Math.round(activeExposure.visibilityScore * 100)}% visibility
                </span>
              </div>
            </div>
          )}

          {/* Exposure log */}
          <div className="tl-exposure-log">
            <div className="tl-exposure-log-head">Exposure Log</div>
            {result.exposures.map((exp, i) => (
              <button
                key={exp.id}
                className={`tl-exposure-row ${i === activeIdx ? 'active' : ''}`}
                onClick={() => setActiveIdx(i)}
              >
                <span className="tl-exposure-ts">{exp.timestamp}</span>
                <span className="tl-exposure-context">{exp.context}</span>
                <span className="badge">{exp.durationSec}s</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!searching && !result && !error && (
        <div className="tl-empty">
          <Search size={32} style={{ opacity: 0.25 }} />
          <p>Search for sponsor brand appearances across indexed match footage using natural language.</p>
        </div>
      )}
    </div>
  );
}
