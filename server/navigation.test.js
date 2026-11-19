import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isUnmodifiedLinkClick } from '../src/lib/routes.ts';

const primaryClick = {
  button: 0,
  defaultPrevented: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
};

test('navigation only intercepts a plain primary activation', () => {
  assert.equal(isUnmodifiedLinkClick(primaryClick), true);
  for (const key of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey', 'defaultPrevented']) {
    assert.equal(isUnmodifiedLinkClick({ ...primaryClick, [key]: true }), false, key);
  }
  for (const button of [1, 2]) {
    assert.equal(isUnmodifiedLinkClick({ ...primaryClick, button }), false, `button ${button}`);
  }
});
