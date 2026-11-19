import test from 'node:test';
import assert from 'node:assert/strict';
import { AssetImage } from '../src/components/AssetImage.tsx';

test('asset images preserve absolute URLs and root relative local paths', () => {
  for (const file of ['https://example.test/portrait.jpg', 'http://example.test/portrait.jpg', '//example.test/portrait.jpg', '/portrait.jpg', 'portrait.jpg']) {
    const expected = file.startsWith('http') || file.startsWith('/') ? file : `/${file}`;
    const image = AssetImage({ file, fallbackFiles: [file], alt: 'Portrait' });
    assert.equal(image.props.src, expected);
    const target = { src: '/broken.jpg' };
    image.props.onError({ target });
    assert.equal(target.src, expected);
  }
});

test('empty asset images use a placeholder and an empty fallback list leaves the source alone', () => {
  for (const file of [undefined, '']) {
    const image = AssetImage({ file, alt: 'Portrait' });
    assert.equal(image.props.src, '/placeholder.jpg');
    const target = { src: '/broken.jpg' };
    image.props.onError({ target });
    assert.equal(target.src, '/broken.jpg');
  }
});
