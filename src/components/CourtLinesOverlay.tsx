import React from 'react';

/**
 * Court wireframe after Merci Michel's "The Tie-break!": pure white strokes composited with
 * `mix-blend-mode: screen`, so the photograph's own lighting (crimson rim-light, royal-blue
 * court, hardwood reflections) bleeds through the lines. Decorative and non-interactive:
 * mount inside any `relative` card, above the photography.
 *
 * Implementation notes:
 *  - `mix-blend-screen` lives on the wrapper, not the <svg>. The wrapper is positioned with a
 *    z-index, so it forms its own stacking context; a blend mode on the child would only blend
 *    against the wrapper's transparent backdrop and never reach the photo underneath.
 *  - Geometry sits in a fixed 1000x600 viewBox stretched with `preserveAspectRatio="none"`.
 *    `non-scaling-stroke` keeps the 1.2 stroke width constant on screen despite that stretch.
 *  - The bloom filter is applied to the <g>, whose bounding box is non-degenerate, so the
 *    default objectBoundingBox filter region is safe for the perfectly horizontal and vertical
 *    lines inside it.
 */
export const CourtLinesOverlay: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-hidden mix-blend-screen"
    >
      <svg
        viewBox="0 0 1000 600"
        preserveAspectRatio="none"
        className="w-full h-full"
        focusable="false"
      >
        <defs>
          {/* Subtle optical bloom matching 35mm film halation */}
          <filter id="tennisLineBloom" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="0.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Pure white, 42% base opacity; screen blending lets underlying glows bleed through */}
        <g
          stroke="rgba(255, 255, 255, 0.42)"
          strokeWidth="1.2"
          fill="none"
          filter="url(#tennisLineBloom)"
        >
          {/* Top continuous horizontal line, edge to edge */}
          <line x1="0" y1="120" x2="1000" y2="120" vectorEffect="non-scaling-stroke" />
          {/* Left tramline: joins the top line (y=120) to the baseline (y=480), no overhangs */}
          <line x1="260" y1="120" x2="260" y2="480" vectorEffect="non-scaling-stroke" />
          {/* Right tramline: joins the top line (y=120) to the baseline (y=480), no overhangs */}
          <line x1="740" y1="120" x2="740" y2="480" vectorEffect="non-scaling-stroke" />
          {/* Left mid-height net tick: crosses the left tramline at y=300 */}
          <line x1="210" y1="300" x2="310" y2="300" vectorEffect="non-scaling-stroke" />
          {/* Right mid-height net tick: crosses the right tramline at y=300 */}
          <line x1="690" y1="300" x2="790" y2="300" vectorEffect="non-scaling-stroke" />
          {/* Broken baseline, left segment: stops at x=440 to open the left gap */}
          <line x1="0" y1="480" x2="440" y2="480" vectorEffect="non-scaling-stroke" />
          {/* Centre service notch: drops from y=480 to y=560 at x=500 */}
          <line x1="500" y1="480" x2="500" y2="560" vectorEffect="non-scaling-stroke" />
          {/* Broken baseline, right segment: resumes at x=560 after the right gap */}
          <line x1="560" y1="480" x2="1000" y2="480" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
    </div>
  );
};

export default CourtLinesOverlay;
