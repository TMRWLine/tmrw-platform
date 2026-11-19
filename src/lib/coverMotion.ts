export const COVER_WORD_DELAYS = [260, 600, 940, 1280] as const;
export const COVER_SETTLE_MS = 2800;
export const COVER_LINE_DELAYS = [0, 1, 1, 2, 2, 2, 3, 2].map(beat => COVER_WORD_DELAYS[beat]);

export function isPastedCover(search: string): boolean {
  return new URLSearchParams(search).get('cover') === 'pasted';
}

type WordBox = Pick<DOMRectReadOnly, 'left' | 'top' | 'width' | 'height'>;

export function coverWordTransform(start: WordBox, end: WordBox): string {
  return `translate(${start.left - end.left}px, ${start.top - end.top}px) scale(${start.width / end.width}, ${start.height / end.height})`;
}
