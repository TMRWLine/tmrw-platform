import React from 'react';

export type FrameTone = 'light' | 'dark';

interface ViewportFrameProps {
  tone?: FrameTone;
}

/**
 * Persistent 1px architectural rails along the top and bottom of every surface.
 * Side gutters stay open so the canvas remains a clean white field.
 */
export const ViewportFrame: React.FC<ViewportFrameProps> = ({ tone = 'light' }) => {
  const dark = tone === 'dark';
  const border = dark ? 'border-[rgba(255,255,255,0.08)]' : 'border-[rgba(0,0,0,0.08)]';

  return (
    <div
      aria-hidden="true"
      className={`viewport-frame pointer-events-none fixed inset-3 z-[45] border-y md:inset-4 ${border}`}
    />
  );
};

export default ViewportFrame;
