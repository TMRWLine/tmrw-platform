import { useEffect, useRef, useState } from 'react';
import { Instagram, Pause, Play, X } from 'lucide-react';
import type { Athlete } from '../types';
import { athleteDossier } from '../lib/athleteDossier';

export function FilmModal({ athlete, onClose }: { athlete: Athlete; onClose: () => void }) {
  const d = athleteDossier(athlete);
  const clips = [
    { id: 'match', label: 'Instagram match reel', src: d.matchReelUrl, stamp: d.logs[0]?.stamp ?? '12:04' },
    { id: 'training', label: 'Vertical training clip', src: d.trainingClipUrl, stamp: d.logs[1]?.stamp ?? '03:18' },
  ];
  const [activeId, setActiveId] = useState(clips[0].id);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const active = clips.find((c) => c.id === activeId) ?? clips[0];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (playing) void el.play();
    else el.pause();
  }, [playing, active.src]);

  function togglePlay() {
    setPlaying((prev) => !prev);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Match footage"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#08080A] border border-white/10 p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute top-4 right-4 text-zinc-500 hover:text-white"
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

        <div className="relative bg-black mb-4">
          <video
            ref={videoRef}
            key={active.src}
            className="w-full aspect-video"
            src={active.src}
            playsInline
            muted
            onEnded={() => setPlaying(false)}
          />
          <button
            type="button"
            className={`absolute inset-0 grid place-items-center cursor-pointer border-0 ${
              playing ? 'bg-transparent text-transparent hover:bg-black/25 hover:text-white' : 'bg-black/30 text-white'
            }`}
            onClick={togglePlay}
            aria-label={playing ? 'Pause reel' : 'Play reel'}
          >
            {playing ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" />}
          </button>
        </div>

        <div className="flex flex-wrap gap-3 font-mono text-[10px] tracking-widest uppercase text-zinc-400 border border-white/10 p-3 mb-4">
          <span>Match {d.matchDate}</span>
          <span>Venue {d.postcode}</span>
          <span>Clip {active.stamp}</span>
          <span>Community {d.communityReach.toLocaleString('en-AU')}</span>
        </div>

        <ul className="m-0 p-0 list-none grid gap-2 mb-4">
          {clips.map((clip) => (
            <li key={clip.id}>
              <button
                type="button"
                className={`w-full flex items-center justify-between border px-3 py-2 font-mono text-xs cursor-pointer ${
                  clip.id === activeId
                    ? 'border-[#D2FF00] text-[#D2FF00] bg-[#D2FF00]/5'
                    : 'border-white/10 text-zinc-300 bg-transparent'
                }`}
                onClick={() => {
                  setActiveId(clip.id);
                  setPlaying(false);
                }}
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
      </div>
    </div>
  );
}
