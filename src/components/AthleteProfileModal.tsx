import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  BadgeCheck,
  Film,
  Users,
  Download,
  Lock,
  Activity,
  Trophy,
  Zap,
  Target,
  Shield,
  PenLine,
  Loader2,
  CheckCircle2,
  UploadCloud,
  FileVideo,
  AlertCircle,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { Athlete } from '../types';
import { getSportComplianceBadges, getUniversalComplianceBadges } from '../types';
import { athleteInitials, displayName, firstName } from '../lib/formatName';
import { signMasterLicence } from '../api';
import {
  isTwelveLabsConfigured,
  ingestMatchFootage,
  ingestMockFootage,
  generateMockEvents,
  formatSeconds,
  type TwelveLabsEvent,
  type TwelveLabsIndexResult,
  type IngestionProgress,
} from '../lib/twelvelabs';

/* ---------- Brand Kit & Highlights Tab ---------- */

export interface BrandKitTabProps {
  athlete: Athlete;
  onSigned?: (updated: Athlete) => void;
}

export function BrandKitTab({ athlete, onSigned }: BrandKitTabProps) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [signed, setSigned] = useState(athlete.master_licence_signed);

  // Video ingestion state
  const [events, setEvents] = useState<TwelveLabsEvent[]>(() => generateMockEvents(athlete));
  const [ingestion, setIngestion] = useState<IngestionProgress | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [ingestionError, setIngestionError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'mock' | 'twelvelabs'>('mock');
  const [selectedEventIdx, setSelectedEventIdx] = useState<number | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setPlaying(false);
          return 0;
        }
        return p + 0.5;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [playing]);

  const handleFileSelect = useCallback(async (file: File) => {
    setIngesting(true);
    setIngestionError(null);
    setIngestion({ phase: 'uploading', message: 'Preparing upload…', progress: 5 });

    // Create a local object URL for the video preview player
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    try {
      let result: TwelveLabsIndexResult;

      if (isTwelveLabsConfigured()) {
        setDataSource('twelvelabs');
        result = await ingestMatchFootage(file, athlete, setIngestion);
      } else {
        setDataSource('mock');
        result = await ingestMockFootage(athlete, setIngestion);
      }

      setEvents(result.events);
      setSelectedEventIdx(null);
    } catch (e) {
      // Fallback to mock parser on any failure
      setDataSource('mock');
      const mockEvents = generateMockEvents(athlete);
      setEvents(mockEvents);
      setIngestionError(
        e instanceof Error ? e.message : 'Video processing fell back to mock data'
      );
    } finally {
      setIngesting(false);
    }
  }, [athlete]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) handleFileSelect(file);
  }

  async function handleSign() {
    setSigning(true);
    setSignError(null);
    try {
      await signMasterLicence(athlete.id);
      const updated = { ...athlete, master_licence_signed: true };
      setSigned(true);
      onSigned?.(updated);
    } catch (e) {
      setSignError(e instanceof Error ? e.message : 'Failed to sign MOU');
    } finally {
      setSigning(false);
    }
  }

  return (
    <div className="brandkit">
      {/* Match Video Highlight Hub */}
      <div className="brandkit-section">
        <h3 className="brandkit-title">
          <Film size={15} /> Match Video Highlight Hub
        </h3>
        <p className="brandkit-desc">
          Upload match footage for AI-powered event detection. Vertical-format preview
          player with auto-generated SVG brand logos for sponsor-ready social media content.
        </p>

        {/* Video Upload / Selection UI */}
        <div className="video-upload-zone">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div
            className={`upload-dropzone ${ingesting ? 'processing' : ''}`}
            onClick={() => !ingesting && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {ingesting ? (
              <div className="upload-processing">
                <Loader2 size={24} className="spin" />
                <span className="upload-phase-label">{ingestion?.message ?? 'Processing…'}</span>
                <div className="upload-progress-bar">
                  <div
                    className="upload-progress-fill"
                    style={{ width: `${ingestion?.progress ?? 0}%` }}
                  />
                </div>
              </div>
            ) : videoUrl ? (
              <div className="upload-replace">
                <FileVideo size={20} />
                <span>Video loaded — click to replace</span>
              </div>
            ) : (
              <div className="upload-idle">
                <UploadCloud size={24} />
                <span>Drop match footage here or click to browse</span>
                <span className="upload-hint">MP4, MOV, AVI — max 500MB</span>
              </div>
            )}
          </div>
        </div>

        {/* Highlight Player + Brand Logos */}
        <div className="highlight-hub">
          <div className="highlight-player">
            <div className="highlight-screen">
              {videoUrl ? (
                <video
                  src={videoUrl}
                  className="highlight-video-el"
                  muted={muted}
                  playsInline
                />
              ) : (
                <div className="highlight-gradient" />
              )}
              {/* Dynamic SVG Brand Overlay */}
              <div className="highlight-brand-overlay">
                <BrandOverlaySVG athlete={athlete} signed={signed} />
              </div>
              <div className="highlight-overlay-top">
                <div className="highlight-badge">{athlete.sport ?? 'Sport'}</div>
                <div className="highlight-name">{displayName(athlete?.name)}</div>
              </div>
              <div className="highlight-center">
                {!playing ? (
                  <button
                    className="highlight-play"
                    onClick={() => setPlaying(true)}
                    aria-label="Play highlight reel"
                  >
                    <Play size={32} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    className="highlight-play"
                    onClick={() => setPlaying(false)}
                    aria-label="Pause highlight reel"
                  >
                    <Pause size={32} fill="currentColor" />
                  </button>
                )}
              </div>
              <div className="highlight-overlay-bottom">
                <div className="highlight-progress">
                  <div
                    className="highlight-progress-bar"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="highlight-controls">
                  <span className="highlight-time">
                    {formatTime(progress)} / 0:20
                  </span>
                  <button
                    className="highlight-mute"
                    onClick={() => setMuted(!muted)}
                    aria-label={muted ? 'Unmute' : 'Mute'}
                  >
                    {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Generated SVG Brand Logos */}
          <div className="brand-logo-grid">
            <div className="brand-logo-card">
              <BrandLogoSVG athlete={athlete} variant="shield" />
              <span className="brand-logo-label">Shield Mark</span>
            </div>
            <div className="brand-logo-card">
              <BrandLogoSVG athlete={athlete} variant="monogram" />
              <span className="brand-logo-label">Monogram</span>
            </div>
            <div className="brand-logo-card">
              <BrandLogoSVG athlete={athlete} variant="wordmark" />
              <span className="brand-logo-label">Wordmark</span>
            </div>
          </div>
        </div>

        {/* Data source indicator */}
        <div className="data-source-badge">
          <Sparkles size={12} />
          <span>
            {dataSource === 'twelvelabs'
              ? 'Events detected via TwelveLabs AI'
              : 'Mock event data — TwelveLabs API key not configured'}
          </span>
        </div>
        {ingestionError && (
          <div className="ingestion-error">
            <AlertCircle size={13} />
            <span>{ingestionError}</span>
          </div>
        )}
      </div>

      {/* Event Detection Timeline */}
      <div className="brandkit-section">
        <h3 className="brandkit-title">
          <Activity size={15} /> Event Detection Timeline
        </h3>
        <p className="brandkit-desc">
          AI-identified key moments from match footage, tagged for sponsor highlight
          extraction. Click an event to preview.
        </p>
        <EventTimeline
          events={events}
          selectedIdx={selectedEventIdx}
          onSelect={setSelectedEventIdx}
        />
      </div>

      {/* AI Watermark Badge */}
      <div className="brandkit-section">
        <h3 className="brandkit-title">
          <BadgeCheck size={15} /> AI Watermark Badge
        </h3>
        <p className="brandkit-desc">
          This watermark SVG badge is auto-generated and embedded across all digital
          branding assets to verify authenticity and commercial licensing status.
        </p>
        <div className="watermark-stage">
          <WatermarkSVG athlete={athlete} />
        </div>
      </div>

      {/* Brand Assets Summary + Downloads */}
      <div className="brandkit-section">
        <h3 className="brandkit-title">
          <Users size={15} /> Brand Assets &amp; Downloads
        </h3>
        <div className="info-grid">
          <InfoRow label="Watermark ID" value={`WM-${(athlete?.id ?? 'unknown').slice(0, 8).toUpperCase()}`} />
          <InfoRow
            label="Licence Status"
            value={signed ? 'Licensed (2yr MOU)' : 'Unlicensed'}
          />
          <InfoRow
            label="Follower Reach"
            value={athlete.follower_count != null ? athlete.follower_count.toLocaleString() : '—'}
          />
          <InfoRow label="Content Format" value="9:16 Vertical" />
          <InfoRow label="Events Detected" value={String(events.length)} />
        </div>

        <div className="asset-downloads">
          <div className="asset-download-head">
            <Download size={15} />
            <span>Brand Asset Pack</span>
          </div>
          <div className="asset-download-grid">
            <AssetDownload
              label="Highlight Reel (MP4)"
              size="48 MB"
              locked={!signed}
            />
            <AssetDownload
              label="Logo Pack (SVG + PNG)"
              size="12 MB"
              locked={!signed}
            />
            <AssetDownload
              label="Watermark Badge (SVG)"
              size="0.3 MB"
              locked={!signed}
            />
            <AssetDownload
              label="Brand Guidelines (PDF)"
              size="4 MB"
              locked={!signed}
            />
          </div>

          {!signed && (
            <div className="asset-locked-cta">
              <Lock size={14} />
              <span>Sign the Master Licence MOU to unlock all brand asset downloads.</span>
              <button className="btn btn-primary btn-sm" onClick={handleSign} disabled={signing}>
                {signing ? (
                  <><Loader2 size={13} className="spin" /> Signing…</>
                ) : (
                  <><PenLine size={13} /> Sign Digital MOU</>
                )}
              </button>
            </div>
          )}

          {signed && (
            <div className="asset-unlocked-banner">
              <CheckCircle2 size={14} />
              <span>MOU signed — all brand assets unlocked for download.</span>
            </div>
          )}

          {signError && <div className="sign-error">{signError}</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Event Detection Timeline ---------- */

interface MatchEvent {
  timestamp: string;
  label: string;
  icon: LucideIcon;
  type: 'try' | 'linebreak' | 'tackle' | 'kick' | 'general';
  confidence: number;
}

function mapEvents(events: TwelveLabsEvent[]): MatchEvent[] {
  return events.map((evt) => {
    const icon = getEventIcon(evt.type);
    return {
      timestamp: formatSeconds(evt.start),
      label: evt.text,
      icon,
      type: evt.type,
      confidence: evt.confidence,
    };
  });
}

function getEventIcon(type: TwelveLabsEvent['type']): LucideIcon {
  switch (type) {
    case 'try': return Trophy;
    case 'linebreak': return Zap;
    case 'tackle': return Shield;
    case 'kick': return Target;
    default: return Activity;
  }
}

function EventTimeline({
  events,
  selectedIdx,
  onSelect,
}: {
  events: TwelveLabsEvent[];
  selectedIdx: number | null;
  onSelect: (idx: number) => void;
}) {
  const mapped = mapEvents(events);

  if (mapped.length === 0) {
    return (
      <div className="event-timeline-empty">
        <Activity size={20} />
        <span>No events detected yet. Upload match footage to begin analysis.</span>
      </div>
    );
  }

  return (
    <div className="event-timeline">
      {mapped.map((evt, i) => {
        const Icon = evt.icon;
        const isSelected = selectedIdx === i;
        return (
          <div
            className={`event-timeline-item ${isSelected ? 'selected' : ''}`}
            key={i}
            onClick={() => onSelect(i)}
          >
            <div className={`event-timeline-dot event-${evt.type}`}>
              <Icon size={14} />
            </div>
            <div className="event-timeline-content">
              <span className="event-timestamp">{evt.timestamp}</span>
              <span className="event-label">{evt.label}</span>
              <span className="event-confidence">
                {Math.round(evt.confidence * 100)}% confidence
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Generated SVG Brand Logos ---------- */

function BrandLogoSVG({ athlete, variant }: { athlete: Athlete; variant: 'shield' | 'monogram' | 'wordmark' }) {
  const initials = athleteInitials(athlete?.name);

  if (variant === 'monogram') {
    return (
      <svg viewBox="0 0 120 120" width="100" height="100" xmlns="http://www.w3.org/2000/svg" className="brand-logo-svg">
        <rect x="10" y="10" width="100" height="100" fill="#000000" stroke="#000000" strokeWidth="2" />
        <text x="60" y="72" textAnchor="middle" fill="#FFFFFF" fontSize="40" fontWeight="800" fontFamily="Inter, sans-serif">
          {initials}
        </text>
      </svg>
    );
  }

  if (variant === 'wordmark') {
    const givenName = firstName(athlete?.name);
    return (
      <svg viewBox="0 0 200 80" width="140" height="56" xmlns="http://www.w3.org/2000/svg" className="brand-logo-svg">
        <circle cx="24" cy="40" r="18" fill="#000000" stroke="#000000" strokeWidth="2.5" />
        <text x="24" y="46" textAnchor="middle" fill="#FFFFFF" fontSize="14" fontWeight="800" fontFamily="Inter, sans-serif">
          {initials}
        </text>
        <text x="52" y="38" fill="#000000" fontSize="16" fontWeight="700" fontFamily="Inter, sans-serif">
          {givenName.toUpperCase()}
        </text>
        <text x="52" y="54" fill="#5A5A58" fontSize="8" fontWeight="500" fontFamily="Inter, sans-serif" letterSpacing="1.5">
          tmrw/.
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 120 140" width="100" height="116" xmlns="http://www.w3.org/2000/svg" className="brand-logo-svg">
      <path
        d="M60 8 L108 24 L108 70 Q108 100 60 128 Q12 100 12 70 L12 24 Z"
        fill="#000000"
        stroke="#000000"
        strokeWidth="2.5"
      />
      <text x="60" y="68" textAnchor="middle" fill="#FFFFFF" fontSize="28" fontWeight="800" fontFamily="Inter, sans-serif">
        {initials}
      </text>
      <text x="60" y="90" textAnchor="middle" fill="#8A8A88" fontSize="7" fontWeight="600" fontFamily="Inter, sans-serif" letterSpacing="1">
        {athlete.sport?.toUpperCase() ?? 'ATHLETE'}
      </text>
    </svg>
  );
}

/* ---------- Dynamic SVG Brand Overlay (on video) ---------- */

function BrandOverlaySVG({ athlete, signed }: { athlete: Athlete; signed: boolean }) {
  const initials = athleteInitials(athlete?.name);

  return (
    <svg
      viewBox="0 0 180 320"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      className="brand-overlay-svg"
    >
      {/* Top-left brand chip */}
      <g opacity="0.85">
        <rect x="8" y="8" width="70" height="24" fill="#000000" stroke="#000000" strokeWidth="1" />
        <text x="14" y="24" fill="#FFFFFF" fontSize="9" fontWeight="700" fontFamily="Inter, sans-serif" letterSpacing="0.5">
          tmrw/.
        </text>
      </g>
      {/* Bottom watermark */}
      <g opacity="0.75">
        <rect x="8" y="288" width="164" height="24" fill="#000000" />
        <circle cx="22" cy="300" r="8" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
        <text x="22" y="304" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="800" fontFamily="Inter, sans-serif">
          {initials}
        </text>
        <text x="36" y="298" fill="#FFFFFF" fontSize="8" fontWeight="600" fontFamily="Inter, sans-serif">
          {displayName(athlete?.name).toUpperCase().slice(0, 18)}
        </text>
        <text x="36" y="308" fill={signed ? '#FFFFFF' : '#888'} fontSize="6" fontFamily="Inter, sans-serif" letterSpacing="0.5">
          {signed ? 'LICENCED · 2YR MOU' : 'UNLICENCED'}
        </text>
      </g>
    </svg>
  );
}

/* ---------- Watermark SVG ---------- */

function WatermarkSVG({ athlete }: { athlete: Athlete }) {
  const wmId = `WM-${(athlete?.id ?? 'unknown').slice(0, 8).toUpperCase()}`;
  return (
    <svg viewBox="0 0 200 200" width="180" height="180" xmlns="http://www.w3.org/2000/svg" className="watermark-svg">
      <circle cx="100" cy="100" r="92" fill="#000000" stroke="#000000" strokeWidth="3" />
      <circle cx="100" cy="100" r="78" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.3" />
      <path d="M100 30 L110 55 L100 50 L90 55 Z" fill="#FFFFFF" opacity="0.8" />
      <text x="100" y="95" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="700" fontFamily="Inter, sans-serif">
        VERIFIED
      </text>
      <text x="100" y="112" textAnchor="middle" fill="#999" fontSize="8" fontFamily="Inter, sans-serif" letterSpacing="1.5">
        {wmId}
      </text>
      <line x1="55" y1="125" x2="145" y2="125" stroke="#333" strokeWidth="1" />
      <text x="100" y="140" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="600" fontFamily="Inter, sans-serif">
        tmrw/.
      </text>
      <text x="100" y="152" textAnchor="middle" fill="#999" fontSize="6" fontFamily="Inter, sans-serif">
        {athlete.master_licence_signed ? 'LICENCED · 2YR MOU' : 'UNLICENCED'}
      </text>
      {athlete.master_licence_signed && (
        <path d="M88 165 L96 173 L114 155" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

/* ---------- Asset Download Card ---------- */

function AssetDownload({ label, size, locked }: { label: string; size: string; locked: boolean }) {
  return (
    <button className={`asset-card ${locked ? 'locked' : 'unlocked'}`} disabled={locked}>
      <div className="asset-card-icon">
        {locked ? <Lock size={16} /> : <Download size={16} />}
      </div>
      <div className="asset-card-info">
        <span className="asset-card-label">{label}</span>
        <span className="asset-card-size">{size}</span>
      </div>
    </button>
  );
}

/* ---------- Helpers ---------- */

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

function ComplianceChip({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={`compliance-chip ${active ? 'active' : 'inactive'}`}>
      {active ? <BadgeCheck size={14} /> : <Lock size={14} />}
      <span>{label}</span>
    </div>
  );
}

function formatTime(progress: number): string {
  const seconds = Math.floor((progress / 100) * 20);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export { ComplianceChip, InfoRow };
export { getSportComplianceBadges, getUniversalComplianceBadges };
