import React, { useEffect, useState } from 'react';

interface AssetImageProps {
  /** File name inside `/public` (spaces are URL-encoded automatically). */
  file: string;
  /**
   * Ordered list of alternative `/public` files tried when `file` (or the previous fallback)
   * fails to load. Lets a card ship with an editorial stand-in until the final asset lands.
   */
  fallbackFiles?: readonly string[];
  alt: string;
  /** Short mono label rendered on the fallback plate when the asset is missing. Omit for a clean plate. */
  fallbackLabel?: string;
  className?: string;
  /** CSS object-position for the loaded image. */
  objectPosition?: string;
  loading?: 'eager' | 'lazy';
}

/**
 * Photographic asset with a deterministic fallback chain. Production builds never show a
 * broken-image glyph: if every candidate file is absent from `/public` the layout keeps its
 * footprint and renders a dark specimen plate instead.
 */
export const AssetImage: React.FC<AssetImageProps> = ({
  file,
  fallbackFiles,
  alt,
  fallbackLabel,
  className = '',
  objectPosition,
  loading = 'lazy',
}) => {
  const candidates = [file, ...(fallbackFiles ?? [])];
  const candidateKey = candidates.join('|');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [candidateKey]);

  if (index >= candidates.length) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`relative flex items-end overflow-hidden bg-[#080808] ${className}`}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(210,255,0,0.14),transparent_55%)]"
        />
        {fallbackLabel && (
          <span className="relative m-3 font-mono text-[10px] font-bold uppercase tracking-widest text-[#D1D1D1]">
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  const candidate = candidates[index];
  const src = /^https?:\/\//i.test(candidate)
    ? candidate
    : candidate.startsWith('/')
      ? encodeURI(candidate)
      : `/${encodeURI(candidate)}`;

  return (
    <img
      key={candidate}
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setIndex((i) => i + 1)}
      style={objectPosition ? { objectPosition } : undefined}
      className={`object-cover ${className}`}
    />
  );
};

export default AssetImage;
