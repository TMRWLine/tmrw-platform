/** @type {import('tailwindcss').Config} */
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
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mark: ['Neue Haas Grotesk Display', 'Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
        descriptor: ['HTF Tungsten', 'Oswald', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        // tmrw/. master chromatics (see DESIGN.md section 2).
        carbon: '#080808',
        'signal-white': '#F9F9F8',
        volt: '#D2FF00',
        cobalt: '#0038FF',
        hairline: {
          DEFAULT: '#1A1A1A',
          light: '#E5E5EA',
        },
        obsidian: {
          DEFAULT: '#0a0a0c',
          surface: '#121318',
          border: '#1e1f26',
        },
        accent: {
          primary: '#f97316',
          hover: '#ea580c',
          magenta: '#ec4899',
        },
      },
      // The 23.0 degree kinetic forward rake (see DESIGN.md section 4).
      rotate: {
        beam: '23deg',
      },
      skew: {
        beam: '23deg',
      },
      animation: {
        'volt-pulse': 'voltPulse 1.6s ease-in-out infinite',
        'fade-up': 'fadeUp 0.8s ease-out forwards',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'scroll-bounce': 'scrollBounce 2s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'marquee': 'marquee 30s linear infinite',
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
  plugins: [],
};
