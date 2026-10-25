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
        sans: ['Inter', 'Helvetica Neue', 'Helvetica', 'Arial', 'system-ui', 'sans-serif'],
        display: [
          '"PP Neue Montreal"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Plus Jakarta Sans"',
          'Inter',
          'sans-serif',
        ],
        serif: ['"PP Editorial New"', '"Instrument Serif"', 'Georgia', 'Times New Roman', 'serif'],
        mono: ['"PP Fragment Mono"', '"Fragment Mono"', '"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontWeight: {
        display: '800',
        black: '900',
        editorial: '300',
      },
      letterSpacing: {
        display: '-0.04em',
        editorial: '-0.02em',
        telemetry: '0.04em',
      },
      lineHeight: {
        display: '0.95',
      },
      colors: {
        // Flagship tokens: Obsidian Void, Muted Obsidian, Electric Volt
        carbon: '#080808',
        surface: '#121212',
        white: '#F5F5F7',
        volt: '#CCFF00',
        cobalt: '#0038FF',
        hairline: 'rgba(255, 255, 255, 0.08)',
        hairlineLight: '#E5E5EA',
        muted: '#7A7A80',
        infra: '#3A3A3C',
        contrast: '#F5F5F7',
        brand: {
          black: '#000000',
          white: '#FFFFFF',
          cotton: '#FBFBF9',
          cyan: '#009FDA',
          magenta: '#D10074',
          yellow: '#F9E300',
          cobalt: '#0052FF',
          volt: '#CCFF00',
          zinc: '#121212',
          hairline: 'rgba(255, 255, 255, 0.08)',
        },
      },
      clipPath: {
        'blade-23': 'polygon(0 0, calc(100% - 42.45px) 0, 100% 100%, 0 100%)',
        'blade-shutter': 'polygon(42.45px 0, 100% 0, calc(100% - 42.45px) 100%, 0 100%)',
      },
      animation: {
        'fade-up': 'fadeUp 0.8s ease-out forwards',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        // Overlay entrance (`animate-fadeIn`): quicker than the section reveal.
        fadeIn: 'fadeIn 0.25s ease-out forwards',
        'scroll-bounce': 'scrollBounce 2s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'telemetry-ping': 'telemetryPing 2.4s ease-in-out infinite',
        marquee: 'marquee 30s linear infinite',
        // Drawer entrance (`animate-slideInRight`).
        slideInRight: 'slideInRight 0.48s cubic-bezier(0.22, 1, 0.36, 1) forwards',
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
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        scrollBounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(8px)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.15' },
          '50%': { opacity: '0.3' },
        },
        telemetryPing: {
          '0%, 100%': { opacity: '0.35', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.35)' },
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
