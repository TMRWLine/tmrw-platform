import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { AthleteAccessHeader, AthleteAccessTabs, AthleteAccessHero } from './AthleteAccessShell';

test('athlete access header retains the shared lockup and Close action', () => {
  const html = renderToStaticMarkup(<AthleteAccessHeader onClose={() => {}} />);
  assert.match(html.replace(/<[^>]*>/g, '').replace(/\u00a0/g, ' '), /LINE UP YOUR FUTURE/);
  assert.match(html, /aria-label="Close portal"/);
  assert.doesNotMatch(html, /transition-all|\u2014/);
});

test('athlete access tabs select either existing sign-in or token claim mode', () => {
  for (const mode of ['authenticate', 'claim'] as const) {
    const html = renderToStaticMarkup(<AthleteAccessTabs mode={mode} panelId="access-panel" onChange={() => {}} />);
    assert.equal((html.match(/role="tab"/g) || []).length, 2);
    assert.equal((html.match(/aria-selected="true"/g) || []).length, 1);
    assert.match(html, new RegExp(`aria-selected="true"[^>]*>\\s*${mode === 'claim' ? 'CLAIM PROFILE' : 'SIGN IN'}`));
    assert.equal((html.match(/aria-controls="access-panel"/g) || []).length, 2);
  }
});

test('shared hero supports claim and existing portal headings without injecting commercial copy', () => {
  for (const headingLevel of ['h1', 'h2'] as const) {
    const html = renderToStaticMarkup(<AthleteAccessHero lines={['Your profile', 'Your terms']} headingLevel={headingLevel}><p>Private until you consent.</p></AthleteAccessHero>);
    assert.match(html, new RegExp(`<${headingLevel} `));
    assert.match(html, /rounded-\[24px\].*bg-carbon/);
    assert.match(html, /Private until you consent/);
    assert.doesNotMatch(html, /70\/15\/15|agency commissions|\u2014/);
  }
});
