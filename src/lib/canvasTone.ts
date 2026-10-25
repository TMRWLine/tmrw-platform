/** Interpolate two hex colours. Progress is clamped to 0..1. */
export function mixHex(from: string, to: string, progress: number): string {
  const t = Math.min(1, Math.max(0, progress));
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const value = Number.parseInt(full, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export const CANVAS_WHITE = '#FFFFFF';
export const CANVAS_OBSIDIAN = '#0A0A0A';

/** How far the syndicate section has claimed the viewport. 0 is white, 1 is obsidian. */
export function syndicateProgress(section: HTMLElement, viewportHeight: number): number {
  const rect = section.getBoundingClientRect();
  const start = viewportHeight * 0.82;
  const end = viewportHeight * 0.18;
  if (start === end) return rect.top < end ? 1 : 0;
  return Math.min(1, Math.max(0, 1 - (rect.top - end) / (start - end)));
}
