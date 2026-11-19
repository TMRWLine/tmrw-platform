import { useEffect, useState, type CSSProperties } from 'react';
import { releasedWallPhoto, wallTileTiming, wallTimeline, type WallTile } from '../lib/coverWall';
import { LEGENDS_PATH, type LegendsTile } from '../lib/internalLegends';
import './CoverWall.css';

const poses = {
  sprint: ['59 18', 'M58 28L48 51M53 35L36 40 26 32M54 35L70 42 82 31M48 50L71 58 84 79M48 52L37 73 13 77'],
  shot: ['50 25', 'M50 34L52 60M49 36L40 19 43 8M51 35L61 18 58 8M51 59L38 73 39 91M52 59L66 72 68 89', 'M49 5a7 7 0 1 0 14 0a7 7 0 1 0-14 0'],
  carry: ['57 25', 'M55 34L43 54M53 37L66 47 76 39M53 36L41 33 28 44M44 53L66 59 74 81M44 54L33 69 12 82', 'M68 39Q80 23 87 33Q86 43 68 39'],
  surf: ['65 32', 'M62 41L49 59M60 43L40 40 22 30M60 44L76 54 91 49M49 58L65 62 74 77M49 59L39 70 22 75', 'M0 82Q23 72 87 76Q72 87 29 87Z'],
  strike: ['51 28', 'M50 37L45 59M48 41L29 47 15 39M50 41L70 39 83 32M45 58L36 78 45 91M45 60L68 66 85 61', 'M89 57a6 6 0 1 0 12 0a6 6 0 1 0-12 0'],
  racket: ['50 28', 'M50 37L44 62M48 40L64 44 77 32M48 40L38 52 23 55M44 61L65 74 76 85M44 61L28 73 10 81', 'M77 34l9-15q-3-9 4-14q10-5 12 5q0 9-13 10l-9 17Z'],
  lift: ['50 38', 'M50 46L51 69M46 49L29 33 25 19M53 49L70 32 76 19M50 68L29 73 34 89M51 68L72 74 68 89', 'M9 17h82v4H9zM8 9h10v20H8zM82 9h10v20H82z'],
  ride: ['67 30', 'M62 35L43 45M60 37L73 48 85 44M42 45L61 55 54 73M43 45L36 61 49 76', 'M4 77a17 17 0 1 0 34 0a17 17 0 1 0-34 0ZM64 77a17 17 0 1 0 34 0a17 17 0 1 0-34 0ZM23 77l17-23 15 23h-33v-3h29L40 59 26 78Zm31-1 18-22 10 24 3-1-10-26h-4L51 77Z'],
  paddle: ['47 31', 'M46 39L42 62M45 42L60 43 70 55M45 41L31 49 24 42M42 61L63 60 76 69', 'M6 68Q47 80 99 65Q80 82 44 81Q12 77 6 68ZM21 35l58 30-2 3-58-30Z'],
  climb: ['50 32', 'M49 39L50 61M47 44L34 36 34 20M52 43L66 32 69 13M50 60L33 68 28 85M50 60L70 57 76 71', 'M6 90 23 62 14 42 36 11 48 14 22 45 30 60 17 90Z'],
  swim: ['58 51', 'M50 54L29 58M49 53L44 33 62 21 73 39M49 56L68 57 86 55M32 58L18 48 5 54M30 59L15 62 4 59', 'M0 68q12-6 25 0t25 0t25 0t25 0v3q-12-6-25 0t-25 0t-25 0t-25 0Z'],
  swing: ['46 25', 'M46 34L51 57M48 38L62 38 73 29M49 40L63 44 74 31M51 58L35 72 28 91M52 58L70 75 74 89', 'M73 33 87 5l6 2-15 28Z'],
  glide: ['51 21', 'M50 30L45 55M49 34L29 34 9 26M50 34L71 26 90 18M46 55L65 63 88 72M45 56L37 73 34 86', 'M23 88h20v3H23ZM81 74h17v3H81Z'],
  box: ['50 28', 'M49 37L46 60M48 40L58 51 71 38M47 39L30 42 24 31M46 60L27 72 18 88M46 60L64 73 85 84', 'M65 35a8 8 0 1 0 16 0a8 8 0 1 0-16 0ZM16 27a7 7 0 1 0 14 0a7 7 0 1 0-14 0Z'],
} satisfies Record<string, [string, string, string?]>;

type IllustratedTile = WallTile & { pose: keyof typeof poses };

const tiles: IllustratedTile[] = ([
  ['Sprint', '100 m', 'sprint'], ['Basketball', 'Guard', 'shot'], ['Rugby', 'Wing', 'carry'], ['Surf', 'Shortboard', 'surf'],
  ['Football', 'Forward', 'strike'], ['Tennis', 'Singles', 'racket'], ['Weightlifting', 'Snatch', 'lift'], ['Cycling', 'Track', 'ride'],
  ['Paddling', 'Sprint', 'paddle'], ['Climbing', 'Lead', 'climb'], ['Swimming', 'Freestyle', 'swim'], ['Cricket', 'Batter', 'swing'],
  ['Skating', 'Singles', 'glide'], ['Boxing', 'Flyweight', 'box'], ['Netball', 'Shooter', 'shot'], ['Hockey', 'Striker', 'swing'],
  ['Sprint', 'Relay', 'sprint'], ['Rugby', 'Centre', 'carry'], ['Surf', 'Longboard', 'surf'], ['Cycling', 'Road', 'ride'],
  ['Badminton', 'Doubles', 'racket'], ['Football', 'Midfielder', 'strike'], ['Rowing', 'Sculler', 'paddle'], ['Climbing', 'Boulder', 'climb'],
  ['Boxing', 'Lightweight', 'box'], ['Swimming', 'Butterfly', 'swim'], ['Basketball', 'Centre', 'shot'], ['Baseball', 'Hitter', 'swing'],
  ['Triathlon', 'Run', 'sprint'], ['Skating', 'Pairs', 'glide'], ['Squash', 'Singles', 'racket'], ['Weightlifting', 'Clean', 'lift'],
  ['Futsal', 'Pivot', 'strike'], ['Kayaking', 'Slalom', 'paddle'], ['Rugby', 'Fullback', 'carry'], ['Cycling', 'Time trial', 'ride'],
  ['Surf', 'Bodyboard', 'surf'], ['Netball', 'Attack', 'shot'], ['Swimming', 'Medley', 'swim'], ['Climbing', 'Speed', 'climb'],
] as const).map(([sport, caption, pose]) => ({ sport, caption, pose }));

export function CoverWall({ ready, onFlipped, legends }: { ready: boolean; onFlipped: () => void; legends?: LegendsTile[] }) {
  const [timeline] = useState(() => {
    const phone = matchMedia('(max-width: 640px)').matches;
    const timing = wallTimeline(phone);
    return legends ? { ...timing, columns: phone ? 4 : 6, rows: phone ? 3 : 4 } : timing;
  });
  const [full, setFull] = useState(false);
  const flipping = full && ready;

  useEffect(() => {
    const timer = window.setTimeout(() => setFull(true), timeline.populateMs);
    return () => window.clearTimeout(timer);
  }, [timeline]);

  useEffect(() => {
    if (!flipping) return;
    const timer = window.setTimeout(onFlipped, timeline.waveMs);
    return () => window.clearTimeout(timer);
  }, [flipping, onFlipped, timeline]);

  const grid = { '--wall-columns': timeline.columns, '--wall-rows': timeline.rows } as CSSProperties;
  return (
    <div className="cover-wall" data-wall-phase={flipping ? 'flip' : full ? 'full' : 'fill'} data-legends={legends ? true : undefined} style={grid}>
      {tiles.slice(0, timeline.columns * timeline.rows).map((tile, index) => {
        const [head, path, prop] = poses[tile.pose] as [string, string, string?];
        const [cx, cy] = head.split(' ');
        const legend = legends?.[index];
        const photo = legend
          ? { src: LEGENDS_PATH + 'photos/' + legend.filename, alt: legend.name }
          : releasedWallPhoto(tile);
        const { populateDelay, flipDelay } = wallTileTiming(index, timeline);
        const timing = { '--wall-fill-delay': `${populateDelay}ms`, '--wall-flip-delay': `${flipDelay}ms` } as CSSProperties;
        return (
          <div className="cover-wall-slot" key={index} style={timing}>
            <div className="cover-wall-tile">
              {photo ? <img src={photo.src} alt={photo.alt} width="100" height="96" /> : (
                <svg viewBox="0 0 104 96" aria-hidden="true">
                  <g transform={index % 3 === 1 ? 'translate(104 0) scale(-1 1)' : undefined}>
                    <circle cx={cx} cy={cy} r="7" fill="currentColor" />
                    <path d={path} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                    {prop && <path d={prop} fill="currentColor" fillRule="evenodd" />}
                  </g>
                </svg>
              )}
              <span className="cover-wall-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="cover-wall-caption">{legend?.name ?? tile.sport}<small>{legend?.sport ?? tile.caption}</small></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
