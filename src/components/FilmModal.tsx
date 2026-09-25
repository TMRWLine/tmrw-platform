import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Instagram, Maximize2, Pause, Play, UploadCloud, Volume2, VolumeX, X } from 'lucide-react';
import type { Athlete } from '../types';
import { athleteDossier } from '../lib/athleteDossier';
import { clipKindLabel, type UploadedClip } from '../lib/mediaUploads';
import { ProofOfPerformanceUploader } from './ProofOfPerformanceUploader';

const CONTROL_BTN =
  'flex items-center justify-center w-8 h-8 rounded-full border border-[#D2FF00]/30 bg-[#D2FF00]/5 text-[#D2FF00] hover:bg-[#D2FF00] hover:text-black cursor-pointer transition-colors';

interface VaultClip {
  id: string;
  label: string;
  src: string;
  stamp: string;
  upload?: UploadedClip;
}

export function FilmModal({
  athlete,
  isOpen,
  onClose,
  uploadedClips = [],
  onUpload,
}: {
  athlete: Athlete;
  isOpen: boolean;
  onClose: () => void;
  uploadedClips?: UploadedClip[];
  onUpload?: (clips: UploadedClip[]) => void;
}) {
  const d = athleteDossier(athlete);
  const clips: VaultClip[] = [
    ...uploadedClips.map((u) => ({
      id: u.id,
      label: `${clipKindLabel(u.kind)} · vs ${u.opponent}`,
      src: u.src,
      stamp: `${u.licenceDays}d licence`,
      upload: u,
    })),
    { id: 'match', label: 'Instagram match reel', src: d.matchReelUrl, stamp: d.logs[0]?.stamp ?? '12:04' },
    { id: 'training', label: 'Vertical training clip', src: d.trainingClipUrl, stamp: d.logs[1]?.stamp ?? '03:18' },
  ];
  const [activeId, setActiveId] = useState(clips[0].id);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoPlayRef = useRef(false);
  const active = clips.find((c) => c.id === activeId) ?? clips[0];
  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);
    setLoadFailed(false);
  }, [active.src]);

  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => setPlaying(false));
    else el.pause();
  }

  function selectClip(id: string) {
    const next = clips.find((c) => c.id === id);
    setActiveId(id);
    if (next && next.src === active.src) {
      const el = videoRef.current;
      if (el) {
        el.currentTime = 0;
        el.play().catch(() => setPlaying(false));
      }
      return;
    }
    autoPlayRef.current = true;
  }

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label="Match footage">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-[#08080A]/95 backdrop-blur-2xl border border-white/10 p-6 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#D2FF00] shadow-[0_0_16px_#D2FF00]" />
            <button
              type="button"
              className="absolute top-4 right-4 text-zinc-500 hover:text-white bg-transparent border-0 cursor-pointer"
              onClick={onClose}
              aria-label="Close footage"
            >
              <X size={16} />
            </button>
            <p className="font-mono text-[10px] tracking-widest uppercase text-[#D2FF00] mb-2">
              // MEDIA VAULT
            </p>
            <h2 className="text-xl font-black uppercase tracking-tight text-white mt-0 mb-2">
              {d.name} · match footage
            </h2>
            <a
              className="athlete-ig inline-flex mb-4"
              href={d.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram size={12} /> {d.instagramHandle}
            </a>

            <div className="relative mx-auto w-full max-w-[300px] mb-4">
              <div
                className="pointer-events-none absolute inset-0 -z-10 scale-105 overflow-hidden rounded-2xl opacity-20 backdrop-blur-3xl"
                aria-hidden="true"
              >
                <video
                  key={`glow-${active.src}`}
                  src={active.src}
                  muted
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-2 shadow-[0_0_40px_rgba(210,255,0,0.06)]">
              <div className="relative overflow-hidden rounded-xl bg-black aspect-[9/16]">
                <video
                  ref={videoRef}
                  key={active.src}
                  className="absolute inset-0 h-full w-full object-cover cursor-pointer"
                  src={active.src}
                  playsInline
                  muted={muted}
                  preload="metadata"
                  onClick={togglePlay}
                  onLoadedMetadata={(e) => {
                    setDuration(e.currentTarget.duration);
                    if (autoPlayRef.current) {
                      autoPlayRef.current = false;
                      e.currentTarget.play().catch(() => setPlaying(false));
                    }
                  }}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                  onError={() => {
                    autoPlayRef.current = false;
                    setLoadFailed(true);
                  }}
                />
                {loadFailed && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#08080A] px-6 text-center">
                    <span className="font-mono text-[10px] tracking-widest uppercase text-amber-300">Reel unavailable</span>
                    <span className="font-mono text-[10px] text-zinc-500">
                      The source for this clip could not be loaded. Upload proof of performance to replace it.
                    </span>
                  </div>
                )}
                <span className="pointer-events-none absolute top-2 left-2 rounded-full bg-black/70 border border-white/10 px-2 py-0.5 font-mono text-[9px] tracking-widest uppercase text-zinc-300">
                  {active.label}
                </span>
                <span className="pointer-events-none absolute top-2 right-2 rounded-full bg-black/70 border border-[#D2FF00]/40 px-2 py-0.5 font-mono text-[10px] text-[#D2FF00]">
                  {formatClock(currentTime)} / {duration > 0 ? formatClock(duration) : '--:--'}
                </span>
                {!playing && !loadFailed && (
                  <button
                    type="button"
                    className="absolute inset-0 m-auto w-14 h-14 rounded-full border-0 bg-[#D2FF00] text-black flex items-center justify-center cursor-pointer shadow-[0_0_24px_rgba(210,255,0,0.5)]"
                    onClick={togglePlay}
                    aria-label="Play reel"
                  >
                    <Play size={22} className="fill-current ml-0.5" />
                  </button>
                )}
              </div>

              <div
                className="mt-2 h-1.5 w-full rounded-full bg-white/10 cursor-pointer overflow-hidden"
                role="progressbar"
                aria-label="Reel progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progressPct)}
                onClick={(e) => {
                  const el = videoRef.current;
                  if (!el || duration <= 0) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  el.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
                }}
              >
                <div
                  className="h-full rounded-full bg-[#D2FF00] shadow-[0_0_10px_#D2FF00] transition-[width] duration-150"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="mt-2 flex items-center gap-2 px-1">
                <button type="button" className={CONTROL_BTN} onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
                  {playing ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button
                  type="button"
                  className={CONTROL_BTN}
                  onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? 'Unmute' : 'Mute'}
                >
                  {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <span className="flex-1 font-mono text-[10px] text-zinc-500 text-center">
                  {formatClock(currentTime)} / {duration > 0 ? formatClock(duration) : '--:--'}
                </span>
                <button
                  type="button"
                  className={CONTROL_BTN}
                  onClick={() => videoRef.current?.requestFullscreen?.().catch(() => undefined)}
                  aria-label="Fullscreen"
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {active.upload ? (
                <>
                  <Tag label="Fixture" value={active.upload.fixtureDate} />
                  <Tag label="Venue" value={active.upload.venuePostcode} />
                  <Tag label="vs" value={active.upload.opponent} />
                  <Tag label="Licence" value={`${active.upload.licenceDays} days`} />
                  <Tag label="Size" value={`${active.upload.sizeMb} MB`} />
                </>
              ) : (
                <>
                  <Tag label="Fixture" value={d.matchDate} />
                  <Tag label="Venue" value={d.postcode} />
                  <Tag label="vs" value="Match sheet pending" />
                  <Tag label="Match sheet" value={active.stamp} />
                  <Tag label="Local views" value={d.suburbanViews.toLocaleString('en-AU')} />
                </>
              )}
            </div>

            <ul className="m-0 p-0 list-none flex flex-col gap-2 mb-4">
              {clips.map((clip) => (
                <li key={clip.id}>
                  <button
                    type="button"
                    className={`w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 font-mono text-xs cursor-pointer transition-colors ${
                      clip.id === activeId
                        ? 'border-[#D2FF00] text-[#D2FF00] bg-[#D2FF00]/5'
                        : 'border-white/10 text-zinc-300 bg-white/[0.02] hover:border-[#D2FF00]/50'
                    }`}
                    onClick={() => selectClip(clip.id)}
                    aria-current={clip.id === activeId ? 'true' : undefined}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Play size={12} className={clip.id === activeId ? 'fill-current' : ''} />
                      <span className="truncate">{clip.label}</span>
                      {clip.id === activeId && (
                        <span className="text-[9px] tracking-widest uppercase text-[#D2FF00]/70">Now playing</span>
                      )}
                    </span>
                    <span className="flex-shrink-0">{clip.stamp}</span>
                  </button>
                </li>
              ))}
              {d.logs.map((log) => (
                <li
                  key={`${log.stamp}-${log.label}`}
                  className="flex items-start justify-between gap-3 border border-white/10 px-3 py-2 font-mono text-xs text-zinc-400"
                >
                  <span>{log.note}</span>
                  <span className="text-[#D2FF00] flex-shrink-0">{log.stamp}</span>
                </li>
              ))}
            </ul>

            <div className="flex gap-2 font-mono text-[10px] tracking-widest uppercase text-zinc-400">
              <div className="flex-1 min-w-0 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="text-zinc-600 mb-1">Suburban views</div>
                <div className="text-white text-xs">{d.suburbanViews.toLocaleString('en-AU')}</div>
              </div>
              <div className="flex-1 min-w-0 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="text-zinc-600 mb-1">Engagement</div>
                <div className="text-white text-xs">{d.engagementRate.toFixed(1)}%</div>
              </div>
              <div className="flex-1 min-w-0 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="text-zinc-600 mb-1">Community reach</div>
                <div className="text-white text-xs">{d.communityReach.toLocaleString('en-AU')}</div>
              </div>
            </div>

            {onUpload && (
              <div className="mt-4 flex flex-col gap-3">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 border border-white/10 hover:border-[#D2FF00]/50 hover:text-[#D2FF00] bg-transparent text-zinc-300 py-2.5 font-mono text-xs uppercase tracking-widest cursor-pointer transition-colors"
                  onClick={() => setUploaderOpen((v) => !v)}
                  aria-expanded={uploaderOpen}
                >
                  <UploadCloud size={14} /> {uploaderOpen ? 'Hide uploader' : 'Upload proof of performance'}
                </button>
                <AnimatePresence initial={false}>
                  {uploaderOpen && (
                    <motion.div
                      key="uploader"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                      className="overflow-hidden"
                    >
                      <ProofOfPerformanceUploader
                        defaultPostcode={athlete.postcode ?? ''}
                        onUpload={(added) => {
                          onUpload(added);
                          selectClip(added[0].id);
                          setUploaderOpen(false);
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-white/10 px-2 py-1 font-mono text-[10px] tracking-widest uppercase">
      <span className="text-zinc-500">{label}</span>
      <span className="text-white">{value}</span>
    </span>
  );
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
