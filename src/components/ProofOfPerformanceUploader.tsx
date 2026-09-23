import { useRef, useState } from 'react';
import { FileVideo, UploadCloud, X } from 'lucide-react';
import {
  CLIP_KINDS,
  LICENCE_WINDOWS,
  MAX_CLIP_MB,
  isValidPostcode,
  type ClipKind,
  type LicenceWindowDays,
  type UploadedClip,
} from '../lib/mediaUploads';

export function ProofOfPerformanceUploader({
  defaultPostcode,
  onUpload,
}: {
  defaultPostcode: string;
  onUpload: (clips: UploadedClip[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [queued, setQueued] = useState<File[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [kind, setKind] = useState<ClipKind>('raw_match');
  const [fixtureDate, setFixtureDate] = useState('');
  const [opponent, setOpponent] = useState('');
  const [venuePostcode, setVenuePostcode] = useState(isValidPostcode(defaultPostcode) ? defaultPostcode : '');
  const [licenceDays, setLicenceDays] = useState<LicenceWindowDays>(30);

  const canBind =
    queued.length > 0 && fixtureDate !== '' && opponent.trim() !== '' && isValidPostcode(venuePostcode);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const accepted: File[] = [];
    const tooBig: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('video/')) continue;
      if (file.size / 1_048_576 > MAX_CLIP_MB) tooBig.push(file.name);
      else accepted.push(file);
    }
    setQueued((prev) => [...prev, ...accepted]);
    setRejected(tooBig);
  }

  function bind() {
    if (!canBind) return;
    const uploadedAt = new Date().toISOString();
    onUpload(
      queued.map((file, i) => ({
        id: `${uploadedAt}-${i}-${file.name}`,
        src: URL.createObjectURL(file),
        fileName: file.name,
        sizeMb: Number((file.size / 1_048_576).toFixed(1)),
        kind,
        fixtureDate,
        opponent: opponent.trim(),
        venuePostcode: venuePostcode.trim(),
        licenceDays,
        uploadedAt,
      }))
    );
    setQueued([]);
    setRejected([]);
    setOpponent('');
  }

  const field =
    'w-full bg-white/[0.03] border border-white/10 px-3 py-2 font-mono text-xs text-white outline-none focus:border-[#D2FF00]/60';

  return (
    <div className="border border-white/10 p-4 flex flex-col gap-3">
      <p className="font-mono text-[10px] tracking-widest uppercase text-[#D2FF00] m-0">
        // Proof-of-performance upload
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        className="flex flex-col items-center gap-1 border border-dashed border-white/20 hover:border-[#D2FF00]/60 bg-transparent text-zinc-300 py-5 cursor-pointer transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
      >
        <UploadCloud size={20} />
        <span className="font-mono text-xs">Drop match footage, training reels or highlights</span>
        <span className="font-mono text-[10px] text-zinc-500">Multiple files · MP4 / MOV · max {MAX_CLIP_MB}MB each</span>
      </button>

      {queued.length > 0 && (
        <ul className="m-0 p-0 list-none flex flex-col gap-1">
          {queued.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between gap-2 border border-white/10 px-3 py-1.5 font-mono text-xs text-zinc-300"
            >
              <span className="flex items-center gap-2 truncate">
                <FileVideo size={12} /> {file.name}
              </span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                className="bg-transparent border-0 text-zinc-500 hover:text-white cursor-pointer"
                onClick={() => setQueued((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {rejected.length > 0 && (
        <p className="font-mono text-[10px] text-red-400 m-0">
          Over {MAX_CLIP_MB}MB, skipped: {rejected.join(', ')}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 font-mono text-[10px] tracking-widest uppercase text-zinc-500">
          Clip type
          <select className={field} value={kind} onChange={(e) => setKind(e.target.value as ClipKind)}>
            {CLIP_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-mono text-[10px] tracking-widest uppercase text-zinc-500">
          Match date
          <input type="date" className={field} value={fixtureDate} onChange={(e) => setFixtureDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 font-mono text-[10px] tracking-widest uppercase text-zinc-500">
          Opponent
          <input
            className={field}
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            placeholder="Opposition club"
          />
        </label>
        <label className="flex flex-col gap-1 font-mono text-[10px] tracking-widest uppercase text-zinc-500">
          Venue postcode
          <input
            className={field}
            value={venuePostcode}
            onChange={(e) => setVenuePostcode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            placeholder="2088"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] tracking-widest uppercase text-zinc-500">Sponsor licence window</span>
        <div className="flex gap-2">
          {LICENCE_WINDOWS.map((w) => (
            <button
              key={w.days}
              type="button"
              className={`flex-1 border px-3 py-2 font-mono text-xs cursor-pointer transition-colors ${
                licenceDays === w.days
                  ? 'border-[#D2FF00] text-[#D2FF00] bg-[#D2FF00]/5'
                  : 'border-white/10 text-zinc-300 bg-transparent'
              }`}
              onClick={() => setLicenceDays(w.days)}
            >
              {w.days} days
            </button>
          ))}
        </div>
        <p className="font-mono text-[11px] text-zinc-400 m-0">
          {LICENCE_WINDOWS.find((w) => w.days === licenceDays)?.terms}
        </p>
      </div>

      <button
        type="button"
        disabled={!canBind}
        className="py-3 bg-[#D2FF00] text-black font-mono font-bold text-xs uppercase tracking-[0.2em] border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={bind}
      >
        Bind metadata & add {queued.length || ''} to vault
      </button>
    </div>
  );
}
