import React, { useId } from 'react';

interface FilmGrainOverlayProps {
  /** Fine for full-bleed heroes; heavy for high-contrast specimen photography. */
  intensity?: 'fine' | 'heavy';
}

/**
 * Procedural 35mm grain. Fractal noise, desaturated and overlay-blended at very low opacity,
 * breaks up digital colour stepping across stadium floodlights without tinting the grade.
 * Mount as a direct child of a `relative` photographic container.
 */
export const FilmGrainOverlay: React.FC<FilmGrainOverlayProps> = ({ intensity = 'fine' }) => {
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const filterId = `tmrwFilmGrain-${rawId}`;
  const opacity = intensity === 'heavy' ? 'opacity-[0.20]' : 'opacity-[0.055]';

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full pointer-events-none z-10 overflow-hidden mix-blend-overlay ${opacity} select-none`}
    >
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.80"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>
    </div>
  );
};

export default FilmGrainOverlay;
