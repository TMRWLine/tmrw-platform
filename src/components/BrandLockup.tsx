import React from 'react';

interface BrandLockupProps {
  /**
   * `light`: ink wordmark on an off-white surface; the slash + dot flip to Kinetic Volt on hover.
   * `dark`: white wordmark on ink; the slash + dot are always Kinetic Volt.
   */
  tone?: 'light' | 'dark';
  onClick: () => void;
  className?: string;
}

const TAGLINE = 'LINE UP YOUR FUTURE';

/**
 * The `tmrw/.` desktop lockup: wordmark + 23° slash + dot, hairline, justified tagline.
 * Shared by the navigation bar and both full-screen overlays.
 */
export const BrandLockup: React.FC<BrandLockupProps> = ({ tone = 'light', onClick, className = '' }) => {
  const dark = tone === 'dark';
  const ink = dark ? 'text-white' : 'text-[#080808]';
  const mark = dark ? 'text-[#B8FF00]' : 'text-[#080808] group-hover:text-[#B8FF00]';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="tmrw, back to home"
      className={`group inline-flex flex-col items-start p-0 pt-1 bg-transparent border-0 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8FF00] focus-visible:ring-offset-2 ${
        dark ? 'focus-visible:ring-offset-[#080808]' : 'focus-visible:ring-offset-[#F7F7F6]'
      } ${className}`}
    >
      {/* Zero whitespace between text span and SVG to eliminate browser font gaps */}
      <span className="flex items-baseline leading-none">
        <span className={`font-extrabold text-[28px] tracking-[-0.05em] leading-none inline-block ${ink}`}>
          tmrw
        </span>
        <svg
          viewBox="0 0 17 24"
          className={`w-[17px] h-[24px] ml-[0.5px] overflow-visible inline-block align-baseline transition-colors duration-150 ${mark}`}
          fill="currentColor"
          aria-hidden="true"
          focusable="false"
        >
          {/* 23.0° slash from cap-height (y=1.5) to the baseline (y=24) */}
          <polygon points="0,24 5.8,24 14.8,1.5 9.0,1.5" />
          {/* Dot resting on the baseline (cy=21.2, r=2.8 => bottom touches y=24) */}
          <circle cx="11.8" cy="21.2" r="2.8" />
        </svg>
      </span>

      {/* Hairline spanning the exact lockup width */}
      <span className={`block w-full h-px opacity-25 mt-[5px] mb-[4px] bg-current ${ink}`} />

      {/* Tagline justified to the hairline's outer margins */}
      <span
        aria-hidden="true"
        className={`w-full flex justify-between font-mono font-bold text-[7.5px] tracking-[0.20em] uppercase leading-none ${ink}`}
      >
        {TAGLINE.split('').map((ch, i) => (
          <span key={i}>{ch === ' ' ? '\u00A0' : ch}</span>
        ))}
      </span>
    </button>
  );
};

export default BrandLockup;
