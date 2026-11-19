import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';

test('shared site footers identify themselves for runway duplicate suppression', async () => {
  const svgImports = registerHooks({
    load(url, context, nextLoad) {
      if (!url.startsWith('file:') || !url.endsWith('.svg?raw')) return nextLoad(url, context);
      const svg = readFileSync(new URL(url), 'utf8');
      return { format: 'module', shortCircuit: true, source: `export default ${JSON.stringify(svg)}` };
    },
  });
  const { SiteFooter } = await import('../src/components/SiteFooter.tsx').finally(() => svgImports.deregister());
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
