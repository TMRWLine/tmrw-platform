import assert from 'node:assert/strict';
import test from 'node:test';
import { AssetImage, assetImageSources } from '../src/components/AssetImage.tsx';

function imageTarget(src) {
  const attributes = new Map([['src', src]]);
  return { getAttribute: attributes.get.bind(attributes), setAttribute: attributes.set.bind(attributes) };
}

test('image fallbacks preserve absolute URLs and try each distinct source only once', () => {
  const remote = 'https://images.unsplash.com/example.jpg';
  assert.deepEqual(assetImageSources('local.jpg', [remote, '/local.jpg', remote, 'last.jpg']), [
    '/local.jpg', remote, '/last.jpg',
  ]);
  assert.deepEqual(assetImageSources(undefined, []), ['/placeholder.jpg']);
});
test('asset images preserve absolute URLs and root relative local paths', () => {
  for (const file of ['https://example.test/portrait.jpg', 'http://example.test/portrait.jpg', '//example.test/portrait.jpg', '/portrait.jpg', 'portrait.jpg']) {
    const expected = file.startsWith('http') || file.startsWith('/') ? file : `/${file}`;
    const image = AssetImage({ file, fallbackFiles: [file], alt: 'Portrait' });
    assert.equal(image.props.src, expected);
    const withFallback = AssetImage({ file: 'broken.jpg', fallbackFiles: [file], alt: 'Portrait' });
    const target = imageTarget(withFallback.props.src);
    withFallback.props.onError({ currentTarget: target });
    assert.equal(target.getAttribute('src'), expected);
  }
});

test('empty asset images use a placeholder and an empty fallback list leaves the source alone', () => {
  for (const file of [undefined, '']) {
    const image = AssetImage({ file, alt: 'Portrait' });
    assert.equal(image.props.src, '/placeholder.jpg');
    const target = imageTarget(image.props.src);
    image.props.onError({ currentTarget: target });
    assert.equal(target.getAttribute('src'), '/placeholder.jpg');
  }
});
