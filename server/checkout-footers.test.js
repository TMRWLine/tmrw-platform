import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';
import { SiteFooter } from '../src/components/SiteFooter.tsx';

test('shared site footers identify themselves for runway duplicate suppression', () => {
  for (const tone of ['light', 'dark']) {
    const html = renderToStaticMarkup(React.createElement(SiteFooter, { onHome() {}, tone }));
    assert.match(html, /^<footer data-site-footer="true"/);
  }
});

test('runway suppresses only shared site footers, without hiding checkout actions at any width', () => {
  const source = readFileSync(new URL('../src/components/SyndicateRunway.tsx', import.meta.url), 'utf8');
  const [, css] = source.match(/<style>\{`([\s\S]*?)`\}<\/style>/);
  const rules = [];
  postcss.parse(css).walkRules((rule) => {
    if (rule.selector.includes('footer')) rules.push(rule);
  });
  assert.equal(rules.length, 1);
  assert.equal(rules[0].selector, 'body:has(#tmrw-locked-runway-footer) footer[data-site-footer]');
  assert.equal(rules[0].parent.type, 'root');
  const display = rules[0].nodes.find((node) => node.prop === 'display');
  assert.equal(display.value, 'none');
  assert.equal(display.important, true);
});
