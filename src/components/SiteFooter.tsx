import React from 'react';
import { BrandLockup } from './BrandLockup';

interface SiteFooterProps {
  onHome: () => void;
  tone?: 'light' | 'dark';
}

export const SiteFooter: React.FC<SiteFooterProps> = ({ onHome, tone = 'light' }) => {
  const dark = tone === 'dark';
  return (
    <footer className="max-w-[1400px] mx-auto px-4 md:px-8 py-12 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
      <BrandLockup tone={dark ? 'dark' : 'light'} onClick={onHome} />
      <p className={`m-0 max-w-md text-xs leading-relaxed ${dark ? 'text-white/45' : 'text-[#666666]'}`}>
        © 2026 tmrw/. All rights reserved. Sovereign sports commercialisation infrastructure for
        Australia and New Zealand.
      </p>
    </footer>
  );
};

export default SiteFooter;
