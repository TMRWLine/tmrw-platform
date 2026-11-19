import { useEffect, useRef, useState } from 'react';
import type { CoverConcept } from '../lib/coverConcept';
import './CoverConcepts.css';

const concepts = [
  { id: 'a', name: 'Night Game', reference: 'Route 66: Centennial', slug: 'route-66-centennial', pitch: 'Walk out into the lights. Follow the painted court into How it works.' },
  { id: 'c', name: 'The Line-up Wall', reference: 'Engage Summit 2027', slug: 'engage-summit-2027', pitch: 'A stadium-wide card wave becomes a team sheet you can explore.' },
  { id: 'ac', name: 'Night Game → Line-up Wall', reference: 'Engage Summit 2027', slug: 'engage-summit-2027', pitch: 'Start in the tunnel. Scroll to break the lit court into the local line-up.' },
] as const satisfies readonly { id: CoverConcept; name: string; reference: string; slug: string; pitch: string }[];

type Concept = typeof concepts[number];
const conceptUrl = ({ id }: Concept) => `/?concept=${id}`;
const frames = [{ width: 1440, height: 900, label: 'Desktop' }, { width: 390, height: 844, label: 'Phone' }] as const;

function PreviewFrame({ concept, width, height, label }: typeof frames[number] & { concept: Concept }) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (frame.current) frame.current.style.transform = `scale(${Math.min(1, entry.contentRect.width / width)})`;
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [width]);
  return (
    <div>
      <p className="concept-frame-label">{label} · {width} × {height}</p>
      <div ref={box} className="concept-frame" style={{ aspectRatio: `${width} / ${height}`, maxWidth: width }}>
        <iframe ref={frame} title={`${concept.name}, ${label}`} src={conceptUrl(concept)} width={width} height={height} />
      </div>
    </div>
  );
}

function ConceptCard({ concept }: { concept: Concept }) {
  const [take, setTake] = useState(0);
  return (
    <article className="concept-card">
      <p className="concept-eyebrow">Take {concept.id.toUpperCase()}{concept.id.length === 1 ? '+' : ''}</p>
      <h2>{concept.name}</h2>
      <p>{concept.pitch}</p>
      <p>Reference: <a href={`https://www.awwwards.com/sites/${concept.slug}`}>{concept.reference}</a></p>
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

export default function CoverConcepts() {
  return (
    <main className="concept-board">
      <header>
        <p className="concept-eyebrow">TMRW/. · Homepage motion study</p>
        <h1>Out of the tunnel<span>.</span></h1>
        <p>Three live homepage takes, each with the working menu. Replay the intro, then scroll to see how it lands.</p>
      </header>
      <div className="concept-board-grid">{concepts.map(concept => <ConceptCard key={concept.id} concept={concept} />)}</div>
    </main>
  );
}
