import plugin from 'tailwindcss/plugin';

/**
 * tmrw/. creative tokens. Every value here is documented in DESIGN.md and is
 * derived from the athlete pitch deck (slide_reference.html). Components should
 * reach for these utilities rather than raw hex values or arbitrary sizes.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // The legacy stylesheet in src/index.css owns element resets, so Tailwind's
  // preflight stays off. Utilities and the --tw-* defaults still load.
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        // Inter at weight 900 is the display voice, exactly as set in the deck.
        sans: ['Inter', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['Inter', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        // Master mark only (all lowercase tmrw/.).
        mark: ['Neue Haas Grotesk Display', 'Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
        // Condensed descriptor voice. HTF Tungsten where licensed, Oswald as the web stand-in.
        descriptor: ['HTF Tungsten', 'Oswald', 'Inter', 'sans-serif'],
        // Telemetry, kickers, stamps and ledger data.
        mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', 'monospace'],
      },

      colors: {
        // Monochrome scale, darkest to lightest.
        canvas: '#000000', // pure black: page canvas and photographic wells
        carbon: '#080808', // deck stage black, kept for existing components
        obsidian: '#0A0A0A', // container cards and drawers
        chalk: '#F4F4F0', // deck light ground for metric bands
        'signal-white': '#F9F9F8', // high-contrast text and ledger surfaces

        // Hairlines. `hairline` is the solid dark rule; `edge` is the translucent
        // white rule the deck uses on dark grounds.
        hairline: {
          DEFAULT: '#1A1A1A',
          light: '#E5E5EA',
        },
        edge: {
          DEFAULT: 'rgba(255, 255, 255, 0.15)',
          soft: 'rgba(255, 255, 255, 0.10)',
          strong: 'rgba(255, 255, 255, 0.30)',
        },

        // Kinetic Volt. DEFAULT is the deck value. `bright` is the hover and
        // pressed-forward state, `deep` is the grounded state for strokes and
        // focus rings on light surfaces.
        volt: {
          DEFAULT: '#D2FF00',
          bright: '#D4FF00',
          deep: '#CCFF00',
        },

        // Escrow and verification only. Never decorative.
        cobalt: '#0038FF',
      },

      // Tracking standards. Display type runs tight, telemetry runs wide.
      letterSpacing: {
        tightest: '-0.06em',
        display: '-0.05em',
        headline: '-0.04em',
        title: '-0.03em',
        stamp: '0.12em',
        telemetry: '0.18em',
        kicker: '0.24em',
      },

      lineHeight: {
        display: '0.88',
        headline: '0.92',
      },

      // Bundled size, leading, tracking and weight so one class sets the whole voice.
      fontSize: {
        // Display voice (Inter 900, uppercase at the call site).
        metric: ['clamp(3rem, 6vw, 5.5rem)', { lineHeight: '0.85', letterSpacing: '-0.06em', fontWeight: '900' }],
        'display-xl': ['clamp(2.5rem, 10vw, 9rem)', { lineHeight: '0.84', letterSpacing: '-0.055em', fontWeight: '900' }],
        display: ['clamp(2.25rem, 7.2vw, 6.5rem)', { lineHeight: '0.88', letterSpacing: '-0.05em', fontWeight: '900' }],
        headline: ['clamp(2rem, 4.4vw, 3.5rem)', { lineHeight: '0.92', letterSpacing: '-0.05em', fontWeight: '900' }],
        title: ['2.25rem', { lineHeight: '0.92', letterSpacing: '-0.04em', fontWeight: '900' }],
        'metric-sm': ['2.25rem', { lineHeight: '1', letterSpacing: '-0.04em', fontWeight: '900' }],
        // Body voice.
        lede: ['0.9375rem', { lineHeight: '1.6', letterSpacing: '0' }],
        // Mono telemetry voice (uppercase at the call site).
        kicker: ['0.625rem', { lineHeight: '1.5', letterSpacing: '0.24em', fontWeight: '500' }],
        stamp: ['0.625rem', { lineHeight: '1.4', letterSpacing: '0.18em', fontWeight: '700' }],
        telemetry: ['0.6875rem', { lineHeight: '1.5', letterSpacing: '0.12em', fontWeight: '500' }],
        caption: ['0.5625rem', { lineHeight: '1.4', letterSpacing: '0.22em', fontWeight: '500' }],
      },

      // The 23.0 degree kinetic forward rake (see DESIGN.md).
      rotate: {
        beam: '23deg',
      },
      skew: {
        beam: '23deg',
      },

      // No soft drop shadows anywhere. The volt halo is the single exception,
      // reserved for the primary Sponsor Athlete action and live indicators.
      boxShadow: {
        'volt-halo': '0 0 0 1px #D2FF00, 0 0 28px rgba(210, 255, 0, 0.45)',
        'volt-ring': '0 0 0 1px #D2FF00',
      },

      // Photographic scrims lifted from the deck cover.
      backgroundImage: {
        'scrim-top': 'linear-gradient(to bottom, #0A0A0A 0%, rgba(10, 10, 10, 0.7) 50%, rgba(10, 10, 10, 0) 100%)',
        'scrim-floor': 'linear-gradient(to top, #000000 0%, #000000 40%, rgba(0, 0, 0, 0) 100%)',
        'scrim-burner': 'radial-gradient(ellipse 36% 52% at 50% 55%, #0A0A0A 0%, rgba(10, 10, 10, 0.9) 50%, rgba(10, 10, 10, 0) 100%)',
        'scrim-sides': 'linear-gradient(to right, #000000 0%, rgba(0, 0, 0, 0) 16%, rgba(0, 0, 0, 0) 84%, #000000 100%)',
        'scrim-bay': 'linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.25) 42%, rgba(0, 0, 0, 0.35) 100%)',
      },

      animation: {
        'volt-pulse': 'voltPulse 1.6s ease-in-out infinite',
        'fade-up': 'fadeUp 0.8s ease-out forwards',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'scroll-bounce': 'scrollBounce 2s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        marquee: 'marquee 30s linear infinite',
      },
      keyframes: {
        voltPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.25' },
        },
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
    plugin(({ addBase, addComponents, addUtilities }) => {
      // Preflight is off, so a side-only border such as `border-b` would leave the
      // other three sides at the browser default width. Any element that opts into
      // `border-solid` starts from zero width, exactly as preflight would do.
      addBase({
        '[class~="border-solid"]': { borderWidth: '0' },
      });
      // Terminal period: the volt full stop that closes every display headline.
      addComponents({
        '.volt-period': {
          color: '#D2FF00',
          letterSpacing: '0',
          marginLeft: '-0.05em',
        },
      });
      // Outlined display type, used for oversized initials behind athlete names.
      addUtilities({
        '.text-outline': {
          color: 'transparent',
          '-webkit-text-stroke': '1px rgba(255, 255, 255, 0.24)',
        },
        '.text-outline-volt': {
          color: 'transparent',
          '-webkit-text-stroke': '1px #D2FF00',
        },
      });
    }),
  ],
};
