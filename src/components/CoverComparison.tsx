import { useEffect, useRef, useState } from 'react';
import './CoverComparison.css';

const DEVICES = [
  { name: 'Desktop', width: 1440, height: 900 },
  { name: 'Phone', width: 390, height: 844 },
] as const;

function Preview({ title, url, width, height }: { title: string; url: string; width: number; height: number }) {
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const frame = container.current;
    if (!frame) return;
    const fit = () => setScale(Math.min(1, frame.clientWidth / width));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={container} className="cover-comparison-frame" style={{ height: height * scale }}>
      <iframe title={title} src={url} width={width} height={height} style={{ transform: `scale(${scale})` }} />
    </div>
  );
}

export default function CoverComparison() {
  const [replay, setReplay] = useState(0);
  const variants = [
    { title: 'Your cover (as pasted)', url: '/?cover=pasted' },
    { title: 'Your cover, polished', url: '/' },
  ];
  return (
    <main className="cover-comparison">
      <h1>Compare your cover</h1>
      <p>Same court card, photo and headline. Compare the original motion with the polished version.</p>
      <button type="button" onClick={() => setReplay(previous => previous + 1)}>Replay both</button>
      {DEVICES.map(({ name, width, height }) => (
        <section key={name} aria-labelledby={`comparison-${name}`}>
          <h2 id={`comparison-${name}`}>{name} · {width}px</h2>
          <div className="cover-comparison-grid">
            {variants.map(({ title, url }) => (
              <article key={title}>
                <h3><a href={url}>{title}</a></h3>
                <Preview key={replay} title={`${title}, ${name.toLowerCase()}`} url={url} width={width} height={height} />
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
