import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import type { CoverConcept } from '../lib/coverConcept';
import { useReducedMotion } from '../lib/useReducedMotion';
import { THE_ROSTER_PATH } from '../lib/routes';
import type { LandingSectionId } from './Navigation';
import './CoverConceptScene.css';

const FloodlightAtmosphere = lazy(() => import('./FloodlightAtmosphere'));
const squad = [
  ['2200', 'Basketball', 'Guard'],
  ['2026', 'Football', 'Keeper'],
  ['4000', 'Netball', 'Wing attack'],
  ['6011', 'Rugby union', 'Flanker'],
  ['3056', 'Basketball', 'Forward'],
  ['4101', 'Football', 'Midfielder'],
  ['1021', 'Netball', 'Goal defence'],
  ['3207', 'Rugby union', 'Fullback'],
] as const;

type Navigate = (section: LandingSectionId) => void;

function goToRoster(event: MouseEvent<HTMLAnchorElement>, navigate: Navigate) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate('roster');
}

function Court({ perspective }: { perspective: boolean }) {
  return (
    <svg className="concept-field" viewBox="0 0 1000 600" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <path pathLength="1" d={perspective
        ? 'M40 493L362 244H638L960 493Z M203 366H797 M500 244V493 M140 493H860'
        : 'M108 103H892V493H108Z M278 103V493 M722 103V493 M108 298H892 M500 103V493'} />
      <path data-cover-centre="" d="M500 493V570" />
    </svg>
  );
}

function StadiumCards() {
  return (
    <div className="concept-cards" aria-hidden="true">
      {Array.from({ length: 40 }, (_, index) => {
        const [postcode, sport, position] = squad[index % squad.length];
        return <div key={index} data-card-accent={(index + Math.floor(index / 8)) % 4 === 1}
          style={{
            '--card-delay': `${(index % 8 + Math.floor(index / 8) * 1.5) * 51}ms`,
            '--card-phase': (index % 8 + Math.floor(index / 8)) * .035,
          } as CSSProperties}>
          <strong>{postcode}</strong><span>{sport}</span><small>{position}</small>
        </div>;
      })}
    </div>
  );
}

function CrowdToggle() {
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => () => { if (audio.current) void audio.current.close(); }, []);
  const toggle = async () => {
    try {
      if (!audio.current) {
        const ctx = new AudioContext();
        audio.current = ctx;
        const noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
        const samples = noise.getChannelData(0);
        let envelope = 0;
        for (let i = 0; i < samples.length; i++) {
          envelope = envelope * .97 + (Math.random() - .5) * .03;
          samples[i] = envelope;
        }
        const texture = ctx.createBufferSource();
        texture.buffer = noise;
        texture.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 530;
        const volume = ctx.createGain();
        volume.gain.value = .34;
        texture.connect(filter).connect(volume).connect(ctx.destination);
        const swell = ctx.createOscillator();
        const depth = ctx.createGain();
        swell.frequency.value = .32;
        depth.gain.value = .095;
        swell.connect(depth).connect(volume.gain);
        texture.start();
        swell.start();
      }
      if (audio.current.state === 'running' && playing) {
        await audio.current.suspend();
        setPlaying(false);
      } else {
        await audio.current.resume();
        setPlaying(audio.current.state === 'running');
      }
    } catch {
      setUnavailable(true);
    }
  };
  return <button type="button" className="concept-control" aria-pressed={playing} disabled={unavailable}
    onClick={() => { void toggle(); }}>{unavailable ? 'Crowd sound unavailable' : 'Crowd sound'}</button>;
}

function SlotPreview({ onNavigate }: { onNavigate: Navigate }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="concept-slot-preview">
      <button type="button" className="concept-control" aria-expanded={open} aria-controls="cover-example-slot"
        onClick={() => setOpen(value => !value)}>Sample line-up card</button>
      <div id="cover-example-slot" className="concept-slot-popover" hidden={!open}>
        <p>Example sponsorship slot</p>
        <p>2200 · Basketball · Guard</p>
        <a href={THE_ROSTER_PATH} onClick={event => goToRoster(event, onNavigate)}>Explore the Roster</a>
      </div>
    </div>
  );
}

export function LineUpWall({ onNavigate }: { onNavigate: Navigate }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const active = selected ?? hovered;
  const example = active === null ? null : squad[active];
  return (
    <section className="line-up-section" aria-labelledby="line-up-heading">
      <p className="line-up-kicker">The local team sheet · Illustrative only</p>
      <h2 id="line-up-heading">Every postcode has a starting line<span>.</span></h2>
      <p>Explore a sample sponsorship slot by sport and position. These are examples, not athlete listings or offers.</p>
      <div className="line-up-tiles" onPointerLeave={() => setHovered(null)}>
        {squad.map(([postcode, sport, position], index) => (
          <button key={postcode} className="line-up-tile" type="button"
            aria-expanded={active === index} aria-controls="line-up-example"
            onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(index); }}
            onClick={() => setSelected(value => value === index ? null : index)}>
            <strong>{postcode}</strong><span>{sport}</span><small>{position}</small>
          </button>
        ))}
      </div>
      <div className="line-up-example" id="line-up-example">
        <p aria-live="polite">{example ? `Example sponsorship slot · ${example.join(' · ')}` : 'Choose a tile to inspect an example.'}</p>
        <a href={THE_ROSTER_PATH} onClick={event => goToRoster(event, onNavigate)}>Browse the actual Roster</a>
      </div>
    </section>
  );
}

export default function CoverConceptScene({ concept, onNavigate }: { concept: CoverConcept; onNavigate: Navigate }) {
  const reduced = useReducedMotion();
  const edge = useRef<HTMLDivElement>(null);
  const night = concept !== 'c';
  useEffect(() => {
    const layer = edge.current;
    const stage = layer?.closest('.cover-stage');
    if (!layer || !stage || reduced || !night) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const { top, height } = stage.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -top / (height * .64)));
      layer.style.setProperty('--concept-exit', String(progress));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
      layer.style.removeProperty('--concept-exit');
    };
  }, [night, reduced]);
  return (
    <>
      <div ref={edge} className="cover-edge concept-edge" aria-hidden="true">
        {night && <div className="concept-night-layer">
          <div className="concept-camera">
            <picture>
              <source type="image/avif" srcSet="/coverpage-420.avif 420w, /coverpage-612.avif 612w" sizes="(max-width: 420px) 100vw, 612px" />
              <source type="image/webp" srcSet="/coverpage-420.webp 420w, /coverpage-612.webp 612w" sizes="(max-width: 420px) 100vw, 612px" />
              <img src="/coverpage.jpg" alt="" width="612" height="407" draggable={false} />
            </picture>
            <div className="concept-tunnel" />
            <div className="concept-banks"><i /><i /><i /></div>
          </div>
          {!reduced && <Suspense fallback={null}><FloodlightAtmosphere /></Suspense>}
          <Court perspective />
        </div>}
        {concept !== 'a' && <div className="concept-wall-layer"><StadiumCards /><Court perspective={false} /></div>}
      </div>
      <div className="concept-inset-controls">
        <a className="concept-control" href="/concepts">Compare covers</a>
        {night && <CrowdToggle />}
        {concept === 'c' && <SlotPreview onNavigate={onNavigate} />}
      </div>
    </>
  );
}
