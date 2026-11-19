import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Navigation } from '../src/components/Navigation.tsx';
import { isPlainLinkActivation } from '../src/lib/routes.ts';

test('site navigation exposes its current page and expanded menu as separate states', () => {
  const props = {
    currentPath: '/commercial-tiers',
    isSearchOpen: false,
    onToggleSearch() {},
    onToggleMenu() {},
    onCloseOverlays() {},
    onOpenPortal() {},
  };
  for (const isMenuOpen of [false, true]) {
    const html = renderToStaticMarkup(createElement(Navigation, { ...props, isMenuOpen }));
    assert.match(html, /href="\/commercial-tiers" aria-current="page"[^>]*>Sponsorship Options<\/a>/);
    assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
    assert.match(html, new RegExp(`aria-label="Open menu" aria-haspopup="dialog" aria-expanded="${isMenuOpen}" aria-controls="site-menu"`));
  }
});

test('client routing leaves modified and non-primary link activations to the browser', () => {
  const primary = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
  assert.equal(isPlainLinkActivation(primary), true);
  for (const key of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey']) {
    assert.equal(isPlainLinkActivation({ ...primary, [key]: true }), false);
  }
  assert.equal(isPlainLinkActivation({ ...primary, button: 1 }), false);
});
