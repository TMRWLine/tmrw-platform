import { useEffect, useRef, useState } from 'react';
import { getProductPhotos, stepSpinFrame } from '../lib/productPhotos';

const PHOTO_VIEWS = [
  ['front', 'Front'], ['back', 'Back'], ['detail', 'Detail'], ['spin', '360°'],
] as const;
type View = (typeof PHOTO_VIEWS)[number][0];

const control = 'min-h-11 border border-black/15 bg-white px-3 text-xs font-semibold text-[#080808] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#080808]';

export function ProductPhotoGallery({ sku, name }: { sku: string; name: string }) {
  const photos = getProductPhotos(sku);
  const hasPhotos = !!(photos.front || photos.back || photos.detail || photos.spin.length);
  const views = PHOTO_VIEWS.filter(([id]) => id === 'spin' ? photos.spin.length > 0 : hasPhotos);
  const [selected, setSelected] = useState<View | undefined>(PHOTO_VIEWS.find(([id]) => id === 'spin' ? photos.spin.length > 0 : photos[id])?.[0]);
  const [frame, setFrame] = useState(0);
  const [play, setPlay] = useState(false);
  const [spinStatus, setSpinStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [failedSource, setFailedSource] = useState<string>();
  const drag = useRef<{ x: number; y: number; frame: number } | undefined>(undefined);
  const count = photos.spin.length;

  useEffect(() => {
    if (selected !== 'spin' || !count) return;
    let active = true;
    setSpinStatus('loading');
    const images: HTMLImageElement[] = [];
    const load = async () => {
      const frames = getProductPhotos(sku).spin;
      for (let i = 0; i < frames.length && active; i += 6) {
        await Promise.all(frames.slice(i, i + 6).map(src => {
          const image = new Image();
          images.push(image);
          image.src = src;
          return image.decode();
        }));
      }
      if (active) setSpinStatus('ready');
    };
    void load().catch(() => { if (active) setSpinStatus('failed'); });
    return () => {
      active = false;
      images.length = 0;
    };
  }, [count, selected, sku]);

  useEffect(() => {
    if (!play || selected !== 'spin' || spinStatus !== 'ready') return;
    const timer = window.setInterval(() => setFrame(index => stepSpinFrame(index, 1, count)), 120);
    return () => window.clearInterval(timer);
  }, [count, play, selected, spinStatus]);

  const select = (view: View) => {
    setSelected(view);
    setPlay(false);
    setFailedSource(undefined);
  };
  const step = (offset: number) => {
    setPlay(false);
    setFrame(index => stepSpinFrame(index, offset, count));
  };
  const spin = selected === 'spin';
  const ready = spin && spinStatus === 'ready';
  const label = PHOTO_VIEWS.find(([id]) => id === selected)?.[1];
  const src = spin ? photos.spin[frame] : selected ? photos[selected] : undefined;

  return (
    <div role="group" aria-label={`${name} product media`} className="min-w-0 space-y-3">
      <div
        className={`relative grid w-full max-h-[460px] place-items-center overflow-hidden bg-[#EAEAE6] text-[#080808] touch-pan-y ${selected ? 'aspect-[4/5]' : 'aspect-[16/10] sm:aspect-[4/5]'} ${ready ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onPointerDown={event => {
          if (!selected || event.button !== 0) return;
          if (spin && !ready) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { x: event.clientX, y: event.clientY, frame };
          if (ready) setPlay(false);
        }}
        onPointerMove={event => {
          if (!ready || !drag.current) return;
          const dx = event.clientX - drag.current.x;
          const dy = event.clientY - drag.current.y;
          if (Math.abs(dx) > Math.abs(dy)) {
            setFrame(stepSpinFrame(drag.current.frame, Math.round(-dx / 9), count));
          }
        }}
        onPointerCancel={() => { drag.current = undefined; }}
        onLostPointerCapture={() => { drag.current = undefined; }}
        onPointerUp={event => {
          const start = drag.current;
          drag.current = undefined;
          if (!start || spin) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) < 35 || Math.abs(dx) < Math.abs(dy)) return;
          const stills = views.filter(([id]) => id !== 'spin');
          const current = stills.findIndex(([id]) => id === selected);
          const next = stills[current + (dx < 0 ? 1 : -1)];
          if (next) select(next[0]);
        }}
      >
        {src && failedSource !== src && (!spin || ready) ? (
          <img key={src} src={src} alt={`${name}, ${spin ? '360° view' : label?.toLowerCase() + ' view'}`}
            draggable={false} onError={() => setFailedSource(src)}
            className="absolute inset-0 h-full w-full object-contain" />
        ) : (
          <div role="status" className="p-5 text-center font-mono text-xs font-semibold text-[#080808]">
            <span aria-hidden="true" className="mb-3 block text-lg font-bold">tmrw/<span className="text-[#080808]">.</span></span>
            <p className="m-0">{spin && spinStatus !== 'failed' && !ready ? 'Loading 360° view…' :
              selected ? `${label} view unavailable. Product photos coming soon.` : 'Product photos coming soon'}</p>
          </div>
        )}
      </div>
      {!!views.length && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Product views">
          {views.map(([id, text]) => (
            <button key={id} type="button" onClick={() => select(id)} aria-pressed={selected === id}
              className={`${control} aria-pressed:border-[#080808] aria-pressed:bg-[#080808] aria-pressed:text-white`}>
              {text}
            </button>
          ))}
        </div>
      )}
      {ready && (
        <div className="space-y-2">
          <label className="block text-xs font-medium">
            Rotate product
            <input type="range" min={0} max={count - 1} value={frame}
              aria-valuetext={`${frame * 10} degrees`}
              onKeyDown={event => {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                event.preventDefault();
                step(event.key === 'ArrowRight' ? 1 : -1);
              }}
              onChange={event => { setPlay(false); setFrame(event.currentTarget.valueAsNumber); }}
              className="block min-h-11 w-full accent-[#080808]" />
          </label>
          <button type="button" className={control} onClick={() => setPlay(value => !value)}>
            {play ? 'Pause rotation' : 'Play rotation'}
          </button>
        </div>
      )}
    </div>
  );
}
