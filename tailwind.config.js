import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'Helvetica Neue',
          'Helvetica',
          'Arial',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          'IBM Plex Mono',
          'SFMono-Regular',
          'ui-monospace',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      colors: {
        'brand-black': '#0A0A0C',
        'brand-carbon': '#121214',
        'brand-zinc': '#1E1E22',
        'brand-cotton': '#FBFBF9',
        'brand-cobalt': '#0052FF',
        'brand-volt': '#D4FF00',
        'brand-emerald': '#00D664',
        'border-hairline': 'rgba(255, 255, 255, 0.08)',
        'border-hairline-light': 'rgba(0, 0, 0, 0.08)',
      },
      clipPath: {
        'blade-23': 'polygon(0 0, calc(100% - 42.45px) 0, 100% 100%, 0 100%)',
        'blade-shutter': 'polygon(42.45px 0, 100% 0, calc(100% - 42.45px) 100%, 0 100%)',
      },
      animation: {
        'fade-up': 'fadeUp 0.8s ease-out forwards',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'scroll-bounce': 'scrollBounce 2s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        marquee: 'marquee 30s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scrollBounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(8px)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.15' },
          '50%': { opacity: '0.3' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [
    plugin(function ({ matchUtilities, theme }) {
      matchUtilities(
        {
          clip: (value) => ({ clipPath: value }),
        },
        { values: theme('clipPath') }
      );
    }),
  ],
};
