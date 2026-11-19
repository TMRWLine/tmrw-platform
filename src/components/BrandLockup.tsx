import React from 'react';

interface BrandLockupProps {
  tone?: 'light' | 'dark';
  onClick: () => void;
  className?: string;
}

const TAGLINE = 'LINE UP YOUR FUTURE';

export const BrandLockup: React.FC<BrandLockupProps> = ({ tone = 'light', onClick, className = '' }) => {
  const dark = tone === 'dark';
  const ink = dark ? 'text-[#F7F7F6]' : 'text-[#080808]';

  return <button type="button" onClick={onClick} aria-label="tmrw/., back to home"
    className={`inline-flex flex-col items-start p-0 pt-1 bg-transparent border-0 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${dark ? 'focus-visible:ring-volt focus-visible:ring-offset-[#080808]' : 'focus-visible:ring-[#080808] focus-visible:ring-offset-[#F7F7F6]'} ${className}`}>
    <svg viewBox="0 0 100 25.4" className={`w-[116px] h-auto block overflow-visible ${ink}`} fill="currentColor" aria-hidden="true" focusable="false" data-brand-wordmark="">
      <g data-brand-letters="">
        <path data-brand-t="" d="M12.7 5.443V11.188H0V5.443ZM2.84 0H9.222V18.105Q9.222 18.993 9.517 19.324Q9.812 19.655 10.69 19.655Q11.12 19.655 11.783 19.655Q12.445 19.655 12.7 19.655V25.4Q12.269 25.4 11.272 25.4Q10.275 25.4 9.19 25.4Q5.871 25.4 4.356 23.973Q2.84 22.546 2.84 19.428Z" />
        <path d="M14.5 25.4V5.747H20.587V10.511H20.349Q20.745 8.706 21.554 7.552Q22.362 6.398 23.456 5.849Q24.549 5.3 25.754 5.3Q27.624 5.3 29.075 6.584Q30.525 7.868 30.795 10.511H30.351Q30.62 8.762 31.46 7.608Q32.3 6.454 33.497 5.877Q34.694 5.3 36.022 5.3Q37.699 5.3 38.98 6.156Q40.261 7.012 40.98 8.576Q41.7 10.139 41.7 12.261V25.4H35.36V14.122Q35.36 12.789 34.775 12.004Q34.19 11.218 33.204 11.218Q32.572 11.218 32.107 11.572Q31.642 11.926 31.377 12.576Q31.112 13.225 31.112 14.122V25.4H25.088V14.122Q25.088 12.782 24.51 12Q23.931 11.218 22.942 11.218Q22.309 11.218 21.836 11.572Q21.363 11.926 21.102 12.576Q20.84 13.226 20.84 14.122V25.4Z" />
        <path d="M43.7 25.4V5.3H49.753V8.955H49.784Q50.236 6.918 51.188 6.109Q52.14 5.3 53.84 5.3Q54.292 5.3 54.659 5.3Q55.026 5.3 55.4 5.3V11.391Q55.072 11.391 54.394 11.391Q53.715 11.391 53.122 11.391Q52.155 11.391 51.438 11.924Q50.72 12.457 50.33 13.437Q49.94 14.417 49.94 15.769V25.4Z" />
        <path d="M60.76 25.4 55.9 5.3H62.2L63.19 10.782Q63.595 13.047 63.97 15.512Q64.345 17.977 64.72 20.375H63.925Q64.36 17.977 64.803 15.512Q65.245 13.047 65.695 10.782L66.79 5.3H72.01L73.105 10.782Q73.555 13.047 73.998 15.512Q74.44 17.977 74.875 20.375H74.11Q74.47 17.977 74.822 15.521Q75.175 13.066 75.55 10.782L76.48 5.3H82.9L78.04 25.4H71.86L70.225 18.395Q70 17.387 69.782 16.33Q69.565 15.274 69.355 14.179Q69.145 13.085 68.92 12H69.88Q69.67 13.085 69.453 14.179Q69.235 15.274 69.025 16.33Q68.815 17.387 68.575 18.395L66.94 25.4Z" />
      </g>
      <g className={dark ? 'text-volt' : 'text-[#080808]'}>
        <polygon data-brand-slash="" points="80.6,25.4 87,25.4 97.782,0 91.382,0" />
        <circle data-brand-dot="" cx="96.25" cy="21.65" r="3.75" />
      </g>
    </svg>
    <span className={`block w-full h-px opacity-25 mt-[5px] mb-[4px] bg-current ${ink}`} />
    <span aria-hidden="true" className={`w-full flex justify-between font-['JetBrains_Mono',monospace] font-bold text-[7.5px] tracking-[0.20em] uppercase leading-none ${ink}`}>
      {TAGLINE.split('').map((ch, i) => <span key={i}>{ch === ' ' ? '\u00A0' : ch}</span>)}
    </span>
  </button>;
};

export default BrandLockup;
