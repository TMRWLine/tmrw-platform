export type LegendsTile = { name: string; sport: string; filename: string };

export function isInternalLegendsCover(search: string, enabled: boolean) {
  const params = new URLSearchParams(search);
  return enabled && params.get('cover') === 'wall' && params.get('legends') === '1';
}

export function readLegendsTiles(input: unknown): LegendsTile[] {
  if (!Array.isArray(input) || input.length !== 24) throw new Error('Expected a 24-tile legends manifest');
  return input.map((tile: Partial<LegendsTile> | null) => {
    if (!tile || typeof tile.name !== 'string' || !tile.name.trim()
      || typeof tile.sport !== 'string' || !tile.sport.trim()
      || typeof tile.filename !== 'string' || !/^[a-z0-9-]+\.webp$/.test(tile.filename)) {
      throw new Error('Invalid legends tile');
    }
    return { name: tile.name, sport: tile.sport, filename: tile.filename };
  });
}

export const LEGENDS_PATH = '/_private-legends/';
