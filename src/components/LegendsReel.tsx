import { useEffect, useState, type CSSProperties } from 'react';
import { LEGENDS_FLICK_MS, LEGENDS_PATH, legendsReelTimeline, type LegendsTile } from '../lib/internalLegends';
import './LegendsReel.css';

const SOLO_SHOTS = 5;

function ActionPhoto({ frame }: { frame: LegendsTile }) {
  return <img src={`${LEGENDS_PATH}photos/${frame.filename}`} alt="" style={{ objectPosition: `${frame.focusX}% ${frame.focusY}%` }} />;
}

function Stills({ frames }: { frames: LegendsTile[] }) {
  return (
    <div className="legends-wall">
      {frames.map((frame, index) => (
        <figure key={frame.filename} style={{ '--legend-delay': `${index * 22}ms` } as CSSProperties}>
          <ActionPhoto frame={frame} />
          <figcaption>{frame.name}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export function LegendsReel({ frames, onReveal, onEnd }: {
  frames: LegendsTile[] | null | undefined;
  onReveal: () => void;
  onEnd: () => void;
}) {
  const [beat, setBeat] = useState(0);
  const timeline = frames && legendsReelTimeline(frames.length);
  const hold = timeline?.[beat];
  const flick = Boolean(timeline && beat === timeline.length);

  useEffect(() => {
    if (frames === undefined) return;
    if (frames === null) {
      onReveal();
      onEnd();
      return;
    }
    if (flick) {
      onReveal();
      const timer = window.setTimeout(onEnd, LEGENDS_FLICK_MS);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setBeat(beat + 1), hold);
    return () => window.clearTimeout(timer);
  }, [beat, flick, frames, hold, onReveal, onEnd]);

  const cut = beat < SOLO_SHOTS ? 'solo' : beat < (frames?.length ?? 0) ? 'rapid' : 'wall';
  return (
    <div className="legends-reel" data-reel-beat={beat} data-reel-cut={flick ? 'flick' : cut} aria-hidden="true">
      {flick ? <div className="legends-flick" style={{ animationDuration: `${LEGENDS_FLICK_MS}ms` }} /> : (
        <>
          {frames?.map((frame, index) => (
            <figure className="legends-shot" key={frame.filename} hidden={index !== beat}
              style={{ '--legend-hold': `${timeline?.[index]}ms` } as CSSProperties}>
              <ActionPhoto frame={frame} />
              <figcaption>
                <span>{frame.sport}</span>
                <strong>{frame.name}</strong>
              </figcaption>
            </figure>
          ))}
          {cut === 'wall' && frames && <Stills frames={frames} />}
          <div className="legends-reel-grain" />
        </>
      )}
    </div>
  );
}
