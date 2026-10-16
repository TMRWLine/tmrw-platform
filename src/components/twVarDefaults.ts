/* Shared Tailwind scaffolding for the cover / landing sections. */

/**
 * Procedural 35mm grain: SVG fractal-noise turbulence as a data-URI.
 * (A data-URI cannot be expressed as a Tailwind class, so it is the one inline style on the grain layer.)
 */
export const GRAIN_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")";

/**
 * This project's Tailwind setup runs with `preflight: false` and without `@tailwind base`, so the
 * `--tw-*` defaults that transform / filter / backdrop-filter utilities compose from are never declared
 * (which would silently invalidate `active:scale-*`, `backdrop-blur-md`, `drop-shadow-*`, ...).
 * Declaring neutral defaults once on the root lets every descendant utility resolve correctly.
 */
export const TW_VAR_DEFAULTS = [
  '[--tw-translate-x:0px]',
  '[--tw-translate-y:0px]',
  '[--tw-rotate:0deg]',
  '[--tw-skew-x:0deg]',
  '[--tw-skew-y:0deg]',
  '[--tw-scale-x:1]',
  '[--tw-scale-y:1]',
  '[--tw-blur:blur(0)]',
  '[--tw-brightness:brightness(1)]',
  '[--tw-contrast:contrast(1)]',
  '[--tw-grayscale:grayscale(0)]',
  '[--tw-hue-rotate:hue-rotate(0deg)]',
  '[--tw-invert:invert(0)]',
  '[--tw-saturate:saturate(1)]',
  '[--tw-sepia:sepia(0)]',
  '[--tw-drop-shadow:drop-shadow(0_0_#0000)]',
  '[--tw-backdrop-blur:blur(0)]',
  '[--tw-backdrop-brightness:brightness(1)]',
  '[--tw-backdrop-contrast:contrast(1)]',
  '[--tw-backdrop-grayscale:grayscale(0)]',
  '[--tw-backdrop-hue-rotate:hue-rotate(0deg)]',
  '[--tw-backdrop-invert:invert(0)]',
  '[--tw-backdrop-opacity:opacity(1)]',
  '[--tw-backdrop-saturate:saturate(1)]',
  '[--tw-backdrop-sepia:sepia(0)]',
].join(' ');
