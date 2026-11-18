import assert from 'node:assert/strict';
import test from 'node:test';
import { buildClaimOutreach } from './claimOutreach';

const input = {
  athleteName: 'Alex Example', club: 'Example Club', whereFound: 'the official club team sheet',
  claimToken: 'test-token', origin: 'https://example.com',
  senderBusinessName: 'TMRW Example Pty Ltd', senderContact: 'hello@example.com',
};

test('draft identifies sender, evidence, sponsorship purpose and working opt-out', () => {
  const draft = buildClaimOutreach(input);
  for (const value of [input.athleteName, input.club, input.whereFound, input.senderBusinessName, input.senderContact,
    'TMRW is not an agent', 'https://example.com/claim?token=test-token',
    'https://example.com/claim?token=test-token&action=unsubscribe']) assert.ok(draft.includes(value), value);
  assert.equal(draft.match(/Review and claim your profile:/g)?.length, 1);
});

test('empty details and unsafe origins are rejected', () => {
  assert.throws(() => buildClaimOutreach({ ...input, senderContact: '' }), /Missing outreach field/);
  assert.throws(() => buildClaimOutreach({ ...input, origin: 'http://example.com' }), /HTTPS/);
  assert.throws(() => buildClaimOutreach({ ...input, origin: 'invalid' }), /Invalid URL/);
});
