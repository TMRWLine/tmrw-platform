import publishedPhotos from '../data/product-photos.json';

export const SPIN_FRAME_COUNT = 36;

type PhotoSet = { front?: boolean; back?: boolean; detail?: boolean; spin?: boolean };

export function getProductPhotos(sku: string, catalogue: Readonly<Record<string, PhotoSet>> = publishedPhotos) {
  const photos = Object.prototype.hasOwnProperty.call(catalogue, sku) ? catalogue[sku] : undefined;
  const root = `/products/${encodeURIComponent(sku)}`;
  return {
    front: photos?.front ? `${root}/front.jpg` : undefined,
    back: photos?.back ? `${root}/back.jpg` : undefined,
    detail: photos?.detail ? `${root}/detail-1.jpg` : undefined,
    spin: photos?.spin ? Array.from({ length: SPIN_FRAME_COUNT }, (_, index) =>
      `${root}/spin/${String(index + 1).padStart(2, '0')}.jpg`) : [],
  };
}

export function stepSpinFrame(frame: number, step: number, total: number) {
  return ((frame + step) % total + total) % total;
}
