import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COVER_CTA_SLIDE_MS, COVER_CTA_START_MS, COVER_GRAZE_DELAY_MS, COVER_GRAZE_MS,
  COVER_LAMP_CUE_MS, COVER_LINE_DELAYS, COVER_LINE_DRAW_MS,
  COVER_SETTLE_MS, COVER_TITLE_MORPH_MS, COVER_WORD_DELAYS, coverWordTransform, isPastedCover,
} from '../src/lib/coverMotion.ts';

test('only cover=pasted opts into the unmodified cover', () => {
  assert.equal(isPastedCover('?cover=pasted'), true);
  for (const query of ['', '?cover=polished', '?concept=a', '?cover=unknown']) {
    assert.equal(isPastedCover(query), false);
  }
});

test('the four reveal beats and settle retain the original timings', () => {
  assert.deepEqual(COVER_WORD_DELAYS, [260, 600, 940, 1280]);
  assert.equal(COVER_SETTLE_MS, 2800);
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
