import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Instagram, UploadCloud, X } from 'lucide-react';
import type { Athlete } from '../types';
import { athleteDossier } from '../lib/athleteDossier';
import { clipKindLabel, type UploadedClip } from '../lib/mediaUploads';
import { ProofOfPerformanceUploader } from './ProofOfPerformanceUploader';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const active = clips.find((c) => c.id === activeId) ?? clips[0];
  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
  }, [active.src]);

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
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
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

            <div className="mx-auto w-full max-w-[280px] mb-4">
              <div className="relative bg-black aspect-[9/16]">
                <video
                  ref={videoRef}
                  key={active.src}
                  className="absolute inset-0 h-full w-full object-cover"
                  src={active.src}
                  controls
                  playsInline
                  muted
                  preload="metadata"
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                />
                <span className="pointer-events-none absolute top-2 right-2 bg-black/70 border border-[#D2FF00]/40 px-2 py-0.5 font-mono text-[10px] text-[#D2FF00]">
                  {formatClock(currentTime)} / {duration > 0 ? formatClock(duration) : '--:--'}
                </span>
              </div>
              <div
                className="h-1 w-full bg-white/10 cursor-pointer"
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
                  className="h-full bg-[#D2FF00] shadow-[0_0_10px_#D2FF00] transition-[width] duration-150"
                  style={{ width: `${progressPct}%` }}
                />
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
                    className={`w-full flex items-center justify-between border px-3 py-2 font-mono text-xs cursor-pointer ${
                      clip.id === activeId
                        ? 'border-[#D2FF00] text-[#D2FF00] bg-[#D2FF00]/5'
                        : 'border-white/10 text-zinc-300 bg-transparent'
                    }`}
                    onClick={() => setActiveId(clip.id)}
                  >
                    <span>{clip.label}</span>
                    <span>{clip.stamp}</span>
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

            <div className="grid grid-cols-3 gap-2 font-mono text-[10px] tracking-widest uppercase text-zinc-400">
              <div className="border border-white/10 p-3">
                <div className="text-zinc-600 mb-1">Suburban views</div>
                <div className="text-white text-xs">{d.suburbanViews.toLocaleString('en-AU')}</div>
              </div>
              <div className="border border-white/10 p-3">
                <div className="text-zinc-600 mb-1">Engagement</div>
                <div className="text-white text-xs">{d.engagementRate.toFixed(1)}%</div>
              </div>
              <div className="border border-white/10 p-3">
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
                          setActiveId(added[0].id);
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
