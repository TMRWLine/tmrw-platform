export type WallTile = {
  sport: string;
  caption: string;
  photo?: { src: string; alt: string; rightsRef: string };
};

export function isWallCover(search: string): boolean {
  return new URLSearchParams(search).get('cover') === 'wall';
}

export function releasedWallPhoto(tile: WallTile) {
  return tile.photo?.rightsRef.trim() ? tile.photo : undefined;
}

export function wallTimeline(phone: boolean) {
  return phone
    ? { columns: 4, rows: 6, populateMs: 1800, waveMs: 820 }
    : { columns: 8, rows: 5, populateMs: 3500, waveMs: 1050 };
}

export function wallTileTiming(index: number, { columns, rows, waveMs, populateMs }: ReturnType<typeof wallTimeline>) {
  const x = index % columns - (columns - 1) / 2;
  const y = Math.floor(index / columns) - (rows - 1) / 2;
  return {
    populateDelay: index * (populateMs - 490) / (columns * rows - 1),
    flipDelay: (waveMs - 465) * Math.hypot(x, y) / Math.hypot((columns - 1) / 2, (rows - 1) / 2),
  };
}
