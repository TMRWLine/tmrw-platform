import React, { useId } from 'react';

interface AmbientNoiseProps {
  /** Keep between 0.03 and 0.06 so the grain reads as atmosphere, not dirt. */
  opacity?: number;
}

/**
 * Ambient SVG fractal noise washed across a section at very low opacity.
 * Prioritising a GPU-composited overlay so interactive cards stay on their own layer.
 */
export const AmbientNoise: React.FC<AmbientNoiseProps> = ({ opacity = 0.04 }) => {
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const filterId = `tmrwAmbientNoise-${rawId}`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden select-none mix-blend-overlay"
      style={{ opacity }}
    >
      <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <filter id={filterId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>
    </div>
  );
};

export default AmbientNoise;
