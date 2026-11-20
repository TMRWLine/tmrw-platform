import React from 'react';
import logoDark from '../../marketing/launch/assets/logo-dark.svg?raw';
import logoLight from '../../marketing/launch/assets/logo-light.svg?raw';

interface BrandLockupProps {
  tone?: 'light' | 'dark';
  onClick: () => void;
  className?: string;
}

const inlineLockup = (svg: string) => svg
  .replace(/<svg[^>]*>/, '<svg viewBox="14 14 100 37.4" aria-hidden="true" focusable="false">')
  .replace(/<rect[^>]*\/>/, '');

const LOCKUPS = { dark: inlineLockup(logoDark), light: inlineLockup(logoLight) };

export const BrandLockup: React.FC<BrandLockupProps> = ({ tone = 'light', onClick, className = '' }) => (
  <button type="button" onClick={onClick} aria-label="tmrw/., back to home"
    className={`group inline-flex items-start border-0 bg-transparent p-0 pt-1 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${tone === 'dark' ? 'focus-visible:ring-volt focus-visible:ring-offset-[#080808]' : 'focus-visible:ring-[#080808] focus-visible:ring-offset-[#F7F7F6]'} ${className}`}>
    <span
      aria-hidden="true"
      className="block w-[116px] [&_svg]:block [&_svg]:w-full motion-safe:[&_polygon]:transition-[fill] group-hover:[&_polygon]:fill-volt group-focus-visible:[&_polygon]:fill-volt"
      dangerouslySetInnerHTML={{ __html: LOCKUPS[tone] }}
    />
  </button>
);

export default BrandLockup;
