import { useEffect, useState } from 'react';
import { LEGENDS_PATH, LEGENDS_PHONE_SIZE, readLegendsTiles, type LegendsTile } from '../lib/internalLegends';

export function useInternalLegends(enabled: boolean) {
  const [tiles, setTiles] = useState<LegendsTile[] | null>();
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let cancelled = false;
    const timeout = window.setTimeout(() => { cancelled = true; controller.abort(); setTiles(null); }, 2500);
    async function load() {
      try {
        const response = await fetch(LEGENDS_PATH + 'credits.json', { signal: controller.signal });
        if (!response.ok) throw new Error('Unable to load the private legends manifest');
        const nextTiles = readLegendsTiles(await response.json());
        const displayed = matchMedia('(max-width: 640px)').matches ? nextTiles.slice(0, LEGENDS_PHONE_SIZE) : nextTiles;
        await Promise.all(displayed.map(tile => {
          const image = new Image();
          image.src = LEGENDS_PATH + 'photos/' + tile.filename;
          return image.decode();
        }));
        if (!cancelled) setTiles(displayed);
      } catch {
        if (!cancelled) setTiles(null);
      } finally {
        window.clearTimeout(timeout);
      }
    }
    void load();
    return () => { cancelled = true; window.clearTimeout(timeout); controller.abort(); };
  }, [enabled]);
  return tiles;
}
