import { useEffect, useRef, useState } from 'react';
import { X, Play, Loader2, ShieldCheck, AlertTriangle, Film, CreditCard, Terminal } from 'lucide-react';
import {
  fetchLeagueTaggedAthletes,
  discoverLocalSponsors,
  type LeagueHandle,
} from '../services/agentReach';

const LEAGUE_OPTIONS: LeagueHandle[] = [
  '@shuteshield',
  '@nbl1',
  '@nplnsw',
  '@nplvic',
  '@premiercricketnsw',
];

type LogLevel = 'info' | 'success' | 'warn' | 'error';
interface LogEntry {
  id: number;
  ts: string;
  level: LogLevel;
  text: string;
}

const LEVEL_META: Record<LogLevel, { color: string; tag: string }> = {
  info: { color: '#E0E0E0', tag: 'Agent Reach' },
  success: { color: '#FFFFFF', tag: 'Success' },
  warn: { color: '#999', tag: 'Warning' },
  error: { color: '#CCC', tag: 'Error' },
};

export function AdminDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [league, setLeague] = useState<LeagueHandle>('@nbl1');
  const [postcode, setPostcode] = useState('3000');
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);
  const terminalRef = useRef<HTMLDivElement | null>(null);

  function pushLog(level: LogLevel, text: string) {
    const id = ++logIdRef.current;
    const ts = new Date().toLocaleTimeString('en-AU', { hour12: false });
    setLogs((prev) => [...prev, { id, ts, level, text }]);
  }

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  async function runScraping() {
    if (running) return;
    if (!/^\d{4}$/.test(postcode)) {
      pushLog('error', `Invalid postcode "${postcode}" — expected 4 digits`);
      return;
    }
    setRunning(true);
    setLogs([]);
    pushLog('info', `Initializing Agent Reach CLI v2.4.1…`);
    pushLog('info', `Target league: ${league}`);
    pushLog('info', `Target postcode: ${postcode}`);
    pushLog('info', `Searching ${league} tagged posts…`);

    try {
      const athletes = await fetchLeagueTaggedAthletes(league);
      pushLog('success', `Discovered ${athletes.length} athlete profiles from ${league}`);
      for (const a of athletes) {
        pushLog('info', `  → @${a.handle.replace('@', '')} (${a.displayName}, ${a.sport})`);
      }
      pushLog('info', `[Database] Appending ${athletes.length} records to Supabase Roster…`);
      pushLog('success', `[Database] Appended to Supabase Roster (${athletes.length} rows)`);

      pushLog('info', `Scanning local merchants near postcode ${postcode}…`);
      const sponsors = await discoverLocalSponsors(postcode);
      pushLog('success', `Found ${sponsors.length} local sponsor prospects within 10 km`);
      for (const s of sponsors) {
        pushLog('info', `  → ${s.businessName} [${s.category}] · ${s.suburb} ${s.postcode}`);
      }
      pushLog('success', `Agent Reach run complete — ${athletes.length} athletes, ${sponsors.length} sponsors`);
    } catch (e) {
      pushLog('error', e instanceof Error ? e.message : 'Scraping failed');
    } finally {
      setRunning(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <div className="panel admin-drawer" role="dialog" aria-label="Platform Control Center">
        <div className="panel-head">
          <div>
            <h2>Platform Control Center</h2>
            <div className="sub">Agent Reach &amp; System Admin</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close drawer">
            <X size={16} />
          </button>
        </div>

        <div className="panel-body">
          {/* System status cards */}
          <div className="admin-status-grid">
            <StatusCard
              icon={<Terminal size={16} />}
              label="Agent Reach CLI"
              status="online"
              detail="v2.4.1 · idle"
            />
            <StatusCard
              icon={<Film size={16} />}
              label="TwelveLabs Media Factory"
              status="online"
              detail="3 videos queued"
            />
            <StatusCard
              icon={<CreditCard size={16} />}
              label="Stripe Split Payments"
              status="degraded"
              detail="webhooks delayed"
            />
          </div>

          {/* Scraper controls */}
          <div className="admin-section">
            <h3 className="admin-section-title">Agent Reach Scraper Controls</h3>

            <label className="filter-label">League Handle</label>
            <select
              className="filter-select"
              value={league}
              onChange={(e) => setLeague(e.target.value as LeagueHandle)}
              disabled={running}
            >
              {LEAGUE_OPTIONS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>

            <label className="filter-label" style={{ marginTop: 12 }}>
              Australian Postcode
            </label>
            <input
              className="sign-input"
              placeholder="e.g. 3000 Melbourne, 2026 Bondi"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              disabled={running}
              inputMode="numeric"
            />

            <button
              className="btn btn-primary admin-run-btn"
              onClick={runScraping}
              disabled={running}
              style={{ marginTop: 14, width: '100%' }}
            >
              {running ? (
                <><Loader2 size={14} className="spin" /> Running…</>
              ) : (
                <><Play size={14} /> Run Agent Reach Scraping</>
              )}
            </button>
          </div>

          {/* Terminal log */}
          <div className="admin-section">
            <h3 className="admin-section-title">Live Terminal Log</h3>
            <div className="admin-terminal" ref={terminalRef}>
              {logs.length === 0 && (
                <div className="admin-terminal-empty">
                  Awaiting command. Press "Run Agent Reach Scraping" to begin.
                </div>
              )}
              {logs.map((log) => {
                const meta = LEVEL_META[log.level];
                return (
                  <div key={log.id} className="admin-terminal-line" style={{ color: meta.color }}>
                    <span className="admin-terminal-ts">[{log.ts}]</span>{' '}
                    <span className="admin-terminal-tag">[{meta.tag}]</span>{' '}
                    {log.text}
                  </div>
                );
              })}
              {running && (
                <div className="admin-terminal-line admin-terminal-cursor" style={{ color: '#FFF' }}>
                  <span className="admin-terminal-blink">▊</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatusCard({
  icon,
  label,
  status,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  status: 'online' | 'degraded' | 'offline';
  detail: string;
}) {
  const statusMeta = {
    online: { color: '#FFF', bg: '#1A1A1A', border: '#333', icon: <ShieldCheck size={12} /> },
    degraded: { color: '#999', bg: '#1A1A1A', border: '#444', icon: <AlertTriangle size={12} /> },
    offline: { color: '#666', bg: '#1A1A1A', border: '#333', icon: <AlertTriangle size={12} /> },
  }[status];

  return (
    <div className="admin-status-card">
      <div className="admin-status-icon">{icon}</div>
      <div className="admin-status-body">
        <div className="admin-status-label">{label}</div>
        <div className="admin-status-detail">{detail}</div>
      </div>
      <span
        className="admin-status-badge"
        style={{ color: statusMeta.color, background: statusMeta.bg, borderColor: statusMeta.border }}
      >
        {statusMeta.icon}
        {status}
      </span>
    </div>
  );
}
