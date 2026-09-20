import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { Athlete } from '../types';
import { athleteDisplayName } from '../lib/formatName';

const TRAINING_REEL =
  'https://videos.pexels.com/video-files/4753989/4753989-hd_1920_1080_30fps.mp4';

export function FilmModal({ athlete, onClose }: { athlete: Athlete; onClose: () => void }) {
  const name = athleteDisplayName(athlete);
  const matchDate = new Date(athlete.created_at || Date.now()).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const seed = hashSeed(athlete.id);
  const clips = [
    { label: 'Verified match reel', stamp: '12:04' },
    { label: 'Vertical training clip', stamp: '03:18' },
    { label: 'Community engagement cut', stamp: '00:42' },
  ];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
        <h2 className="text-xl font-black uppercase tracking-tight text-white mt-0 mb-4">
          {name} · verified footage
        </h2>
        <video
          className="w-full aspect-video bg-black mb-4"
          src={TRAINING_REEL}
          controls
          muted
          playsInline
        />
        <div className="flex flex-wrap gap-3 font-mono text-[10px] tracking-widest uppercase text-zinc-400 border border-white/10 p-3 mb-4">
          <span>Match {matchDate}</span>
          <span>Venue {athlete.postcode ?? '———'}</span>
          <span>Perf {clips[0].stamp} / {clips[1].stamp}</span>
        </div>
        <ul className="m-0 p-0 list-none grid gap-2">
          {clips.map((clip) => (
            <li
              key={clip.label}
              className="flex items-center justify-between border border-white/10 px-3 py-2 font-mono text-xs text-zinc-300"
            >
              <span>{clip.label}</span>
              <span className="text-[#D2FF00]">{clip.stamp}</span>
            </li>
          ))}
        </ul>
        <p className="font-mono text-[10px] tracking-widest uppercase text-zinc-500 mt-4 mb-0">
          Local social reach {((seed % 40) + 12).toFixed(0)}k · engagement {(3 + (seed % 5) + 0.2).toFixed(1)}%
        </p>
      </div>
    </div>
  );
}

function hashSeed(id: string): number {
  return Array.from(id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}
