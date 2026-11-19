export type LegendsTile = { name: string; sport: string; filename: string; focusX?: number; focusY?: number };

export const LEGENDS_REEL_DURATION = [366, 346, 326, 306, 286, 206, 176, 146] as const;
export const LEGENDS_FLICK_MS = 200;
export const LEGENDS_MANIFEST_SIZE = 16;
export const LEGENDS_PHONE_SIZE = 8;
export const LEGENDS_WALL_MS = 370;

export function legendsReelTimeline(frameCount: number) {
  return [...LEGENDS_REEL_DURATION, ...Array.from({ length: frameCount - LEGENDS_PHONE_SIZE },
    (_, index) => 112 - Math.floor(index / 2) * 12), LEGENDS_WALL_MS];
}

export function isInternalLegendsCover(search: string, enabled: boolean) {
  const params = new URLSearchParams(search);
  return enabled && params.get('cover') === 'wall' && params.get('legends') === '1';
}

export function readLegendsTiles(input: unknown): LegendsTile[] {
  if (!Array.isArray(input) || input.length !== LEGENDS_MANIFEST_SIZE) throw new Error('Expected a 16-shot legends manifest');
  return input.map((tile: Partial<LegendsTile> | null) => {
    if (!tile || typeof tile.name !== 'string' || !tile.name.trim()
      || typeof tile.sport !== 'string' || !tile.sport.trim()
      || typeof tile.filename !== 'string' || !/^[a-z0-9-]+\.webp$/.test(tile.filename)) {
      throw new Error('Invalid legends tile');
    }
    const focal = (value: unknown) => typeof value === 'number' && value >= 0 && value <= 100 ? value : 50;
    return { name: tile.name, sport: tile.sport, filename: tile.filename, focusX: focal(tile.focusX), focusY: focal(tile.focusY) };
  });
}

export const LEGENDS_PATH = '/_private-legends/';
