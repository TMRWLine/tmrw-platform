import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COVER_CTA_SLIDE_MS, COVER_CTA_START_MS, COVER_GRAZE_DELAY_MS, COVER_GRAZE_MS,
  COVER_LAMP_CUE_MS, COVER_LINE_DELAYS, COVER_LINE_DRAW_MS,
  COVER_SETTLE_MS, COVER_TITLE_MORPH_MS, COVER_WORD_DELAYS, canAnimateCoverLens, coverWordTransform,
  isPastedCover, isWebGLCover,
} from '../src/lib/coverMotion.ts';
import { isWallCover, releasedWallPhoto, wallTileTiming, wallTimeline } from '../src/lib/coverWall.ts';
import { LEGENDS_FLICK_MS, LEGENDS_MANIFEST_SIZE, LEGENDS_PHONE_SIZE, isInternalLegendsCover, legendsReelTimeline, readLegendsTiles } from '../src/lib/internalLegends.ts';

test('only cover=pasted opts into the unmodified cover', () => {
  assert.equal(isPastedCover('?cover=pasted'), true);
  for (const query of ['', '?cover=polished', '?concept=a', '?cover=unknown']) {
    assert.equal(isPastedCover(query), false);
  }
});

test('the WebGL cover is opt-in and low-power or reduced-motion devices get the still', () => {
  assert.equal(isWebGLCover('?cover=webgl'), true);
  for (const query of ['', '?cover=pasted', '?cover=polished']) assert.equal(isWebGLCover(query), false);
  assert.equal(canAnimateCoverLens(false, {}), true);
  assert.equal(canAnimateCoverLens(false, { deviceMemory: 4 }), true);
  assert.equal(canAnimateCoverLens(false, { deviceMemory: 2 }), false);
  assert.equal(canAnimateCoverLens(true, { deviceMemory: 8 }), false);
  assert.equal(canAnimateCoverLens(false, { deviceMemory: 8, connection: { saveData: true } }), false);
});

test('the four reveal beats and settle retain the original timings', () => {
  assert.deepEqual(COVER_WORD_DELAYS, [260, 600, 940, 1280]);
  assert.equal(COVER_SETTLE_MS, 2800);
});

test('only the wall route opts into the tile sequence; photos require a rights reference', () => {
  assert.equal(isWallCover('?cover=wall'), true);
  for (const query of ['', '?cover=pasted', '?cover=webgl']) assert.equal(isWallCover(query), false);
  const tile = { sport: 'Netball', caption: 'Shooter' };
  assert.equal(releasedWallPhoto(tile), undefined);
  const photo = { src: '/stock.webp', alt: 'Player reaching for a pass', rightsRef: '   ' };
  assert.equal(releasedWallPhoto({ ...tile, photo }), undefined);
  const released = { ...photo, rightsRef: 'LIC-123' };
  assert.equal(releasedWallPhoto({ ...tile, photo: released }), released);
});

test('the desktop and phone walls finish populating before flipping from the centre', () => {
  const desktop = wallTimeline(false);
  const phone = wallTimeline(true);
  assert.deepEqual([desktop.columns, desktop.rows, desktop.populateMs], [8, 5, 3500]);
  assert.deepEqual([phone.columns, phone.rows, phone.populateMs], [4, 6, 1800]);
  for (const timeline of [desktop, phone]) {
    const corner = wallTileTiming(0, timeline);
    const last = wallTileTiming(timeline.columns * timeline.rows - 1, timeline);
    const centre = wallTileTiming(Math.floor(timeline.rows / 2) * timeline.columns + timeline.columns / 2, timeline);
    assert.equal(corner.populateDelay, 0);
    assert.equal(last.populateDelay + 490, timeline.populateMs);
    assert.equal(corner.flipDelay + 465, timeline.waveMs);
    assert.equal(corner.flipDelay, last.flipDelay);
    assert.ok(centre.flipDelay < corner.flipDelay);
  }
});

test('the legends mockup requires a private build and is restricted to local manifest photos', () => {
  assert.equal(isInternalLegendsCover('?cover=wall&legends=1', false), false);
  assert.equal(isInternalLegendsCover('?cover=webgl&legends=1', true), false);
  assert.equal(isInternalLegendsCover('?cover=wall', true), false);
  assert.equal(isInternalLegendsCover('?cover=wall&legends=1', true), true);
  const tile = { name: 'Test athlete', sport: 'Netball', filename: 'test-athlete.webp' };
  assert.equal(readLegendsTiles(Array.from({ length: LEGENDS_MANIFEST_SIZE }, () => tile)).length, LEGENDS_MANIFEST_SIZE);
  assert.throws(() => readLegendsTiles([tile]));
  for (const filename of ['https://example.org/face.webp', '../face.webp']) {
    assert.throws(() => readLegendsTiles(Array.from({ length: LEGENDS_MANIFEST_SIZE }, () => ({ ...tile, filename }))));
  }
});

test('the private reel accelerates into the wall and leaves time for the unchanged settle', () => {
  assert.equal(LEGENDS_MANIFEST_SIZE, 16);
  assert.equal(LEGENDS_PHONE_SIZE, 8);
  assert.ok(LEGENDS_FLICK_MS < COVER_WORD_DELAYS[0]);
  for (const count of [LEGENDS_MANIFEST_SIZE, LEGENDS_PHONE_SIZE]) {
    const timeline = legendsReelTimeline(count);
    assert.equal(timeline.length, count + 1);
    assert.ok(timeline.slice(1, count).every((hold, i) => hold <= timeline[i]));
    const reelTime = timeline.reduce((sum, hold) => sum + hold, 0);
    assert.ok(reelTime + COVER_SETTLE_MS >= 5000 && reelTime + COVER_SETTLE_MS <= 6100);
  }
});

test('the settle maps each final word box back over its opening box', () => {
  assert.equal(coverWordTransform(
    { left: 40, top: 28, width: 120, height: 80 },
    { left: 55, top: 35, width: 60, height: 40 },
  ), 'translate(-15px, -7px) scale(2, 2)');
});

test('court strokes use the four word beats and the bottom centre line draws last', () => {
  assert.deepEqual([...new Set(COVER_LINE_DELAYS)], [...COVER_WORD_DELAYS]);
  assert.equal(COVER_LINE_DELAYS.length, 8);
  assert.equal(COVER_LINE_DELAYS[6], Math.max(...COVER_LINE_DELAYS));
  assert.equal(COVER_LINE_DELAYS.filter(delay => delay === COVER_LINE_DELAYS[6]).length, 1);
});

test('the CTA release follows the final stroke and the title morph fits inside the intro', () => {
  assert.equal(COVER_CTA_START_MS, COVER_LINE_DELAYS[6] + COVER_LINE_DRAW_MS);
  assert.ok(COVER_CTA_START_MS + COVER_CTA_SLIDE_MS <= COVER_SETTLE_MS);
  assert.ok(COVER_SETTLE_MS - COVER_TITLE_MORPH_MS >= COVER_CTA_START_MS);
});

test('word grazes start within the lamp cue and the last cue clears before settle', () => {
  const finalBeat = COVER_WORD_DELAYS.at(-1);
  assert.ok(COVER_GRAZE_DELAY_MS > 0);
  assert.ok(COVER_GRAZE_DELAY_MS + COVER_GRAZE_MS <= COVER_LAMP_CUE_MS);
  assert.ok(finalBeat + COVER_LAMP_CUE_MS < COVER_SETTLE_MS);
});
