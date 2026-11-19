import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { CoverCtas } from './CoverCtas';
import './CoverHero.css';
import './CoverConcepts.css';

const concepts = [
  { id: 'a', name: 'Night Game', reference: 'Route 66 – Centennial', slug: 'route-66-centennial', pitch: 'A tunnel-to-court camera move, a split-second of darkness, then the lights hit.' },
  { id: 'b', name: 'Type Takes the Court', reference: 'Segment Six', slug: 'segment-six', pitch: 'Two enormous lines of type become the screen. The court photo only exists inside the letters until the lock-up lands.' },
  { id: 'c', name: 'The Line-up Wall', reference: 'Engage Summit 2027', slug: 'engage-summit-2027', pitch: 'A wall of abstract registration tiles lights up like a team sheet, then resolves into one court.' },
] as const;

type Concept = typeof concepts[number];
const conceptUrl = ({ id }: Concept) => `/?concept=${id}`;
const referenceUrl = ({ slug }: Concept) => `https://www.awwwards.com/sites/${slug}`;
const frames = [{ width: 1440, height: 900, label: 'Desktop' }, { width: 390, height: 844, label: 'Phone' }] as const;

function PreviewFrame({ concept, width, height, label }: typeof frames[number] & { concept: Concept }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, [width]);
  return (
    <div>
      <p className="concept-frame-label">{label} · {width} × {height}</p>
      <div ref={box} className="concept-frame" style={{ aspectRatio: `${width} / ${height}`, maxWidth: width }}>
        <iframe title={`${concept.name}, ${label}`} src={conceptUrl(concept)} width={width} height={height}
          style={{ transform: `scale(${scale})` }} />
      </div>
    </div>
  );
}

function ConceptCard({ concept }: { concept: Concept }) {
  const [take, setTake] = useState(0);
  return (
    <article className="concept-card">
      <p className="concept-eyebrow">Take {concept.id.toUpperCase()}</p>
      <h2>{concept.name}</h2>
      <p>{concept.pitch}</p>
      <p>Reference: <a href={referenceUrl(concept)}>{concept.reference}</a></p>
      <div className="concept-card-links">
        <button type="button" onClick={() => setTake(n => n + 1)}>Replay both</button>
        <a href={conceptUrl(concept)}>Open full size</a>
      </div>
      <div className="concept-card-frames" key={take}>
        {frames.map(frame => <PreviewFrame key={frame.label} concept={concept} {...frame} />)}
      </div>
    </article>
  );
}

function Court({ id }: { id: Concept['id'] }) {
  return (
    <svg aria-hidden="true" className="concept-court" viewBox="0 0 1000 700" preserveAspectRatio="none" fill="none">
      {id === 'a' ? <path d="M0 594H1000 M120 594L404 307H596L880 594 M310 403H690 M206 507H794 M500 307V594" /> :
        id === 'b' ? <path d="M0 245H1000M0 470H1000M136 0V700M864 0V700M500 245V470" /> :
          <path d="M92 135H908V560H92Z M300 135V560 M700 135V560 M92 348H908 M500 135V560" />}
      <path data-centre-line="" d="M500 594V690" />
    </svg>
  );
}

function moveCamera(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse' ||
      !window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return;
  const node = event.currentTarget;
  const bounds = node.getBoundingClientRect();
  node.style.setProperty('--look-x', `${(event.clientX - bounds.left - bounds.width / 2) / bounds.width * 36}px`);
  node.style.setProperty('--look-y', `${(event.clientY - bounds.top - bounds.height / 2) / bounds.height * 24}px`);
}

function ConceptCover({ concept }: { concept: Concept }) {
  return (
    <main className={`concept-preview concept-preview-${concept.id}`}>
      <section className="concept-stage" aria-label={concept.name}
        onPointerMove={concept.id === 'a' ? moveCamera : undefined}
        onPointerLeave={concept.id === 'a' ? ({ currentTarget }) => {
          currentTarget.style.removeProperty('--look-x');
          currentTarget.style.removeProperty('--look-y');
        } : undefined}>
        <div className="concept-scene" aria-hidden="true">
          {concept.id === 'a' && (
            <div className="concept-lens"><div className="concept-night-image" /><div className="concept-light" /></div>
          )}
          {concept.id === 'c' && (
            <div className="concept-tile-grid">
              {Array.from({ length: 48 }, (_, i) => (
                <span key={i} data-accent={i % 7 === 2 || i % 7 === 4} style={{ '--tile-delay': `${((i % 8) + (5 - Math.floor(i / 8)) * 1.6) * 48}ms` } as CSSProperties}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                </span>
              ))}
            </div>
          )}
          <Court id={concept.id} />
          {concept.id === 'b' && <div className="concept-type-image">Line up<br />your future</div>}
        </div>
        <div className="concept-meta"><span>tmrw/.</span><span>0{concept.id.charCodeAt(0) - 96} / {concept.name}</span></div>
        <h1 className="concept-title">
          <span>Line up</span>{' '}
          <span>your future<span className="concept-dot" aria-hidden="true" /></span>
        </h1>
        <div className="cover-actions concept-actions"><CoverCtas /></div>
        <p className="concept-caption">Inspired by <a href={referenceUrl(concept)} target="_blank" rel="noreferrer">{concept.reference}</a></p>
      </section>
      {concept.id === 'a' && <div className="concept-follow"><a href="/concepts">Compare all three takes</a></div>}
    </main>
  );
}

export default function CoverConcepts() {
  const key = new URLSearchParams(window.location.search).get('concept');
  const selected = concepts.find(concept => concept.id === key);
  if (window.location.pathname === '/' && selected) return <ConceptCover concept={selected} />;
  return (
    <main className="concept-board">
      <header>
        <p className="concept-eyebrow">TMRW/. · Motion study</p>
        <h1>Three takes.<br />One starting line<span>.</span></h1>
        <p>Three working directions for the same homepage. Replay both sizes or open a cover full size.</p>
      </header>
      <div className="concept-board-grid">{concepts.map(concept => <ConceptCard key={concept.id} concept={concept} />)}</div>
    </main>
  );
}
