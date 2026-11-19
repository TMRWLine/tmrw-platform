import React from 'react';

export interface AssetImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  file?: string;
  fallbackFiles?: readonly string[];
  alt: string;
  objectPosition?: string;
}

export function assetImageSources(file: string | undefined, fallbackFiles: readonly string[]) {
  const primary = typeof file === 'string' && file ? file : 'placeholder.jpg';
  return Array.from(new Set([primary, ...fallbackFiles].map(path =>
    /^https?:\/\//i.test(path) || path.startsWith('/') ? path : `/${path}`,
  )));
}

export const AssetImage: React.FC<AssetImageProps> = ({
  file,
  fallbackFiles = [],
  alt,
  objectPosition,
  className = '',
  ...props
}) => {
  const sources = assetImageSources(file, fallbackFiles);

  return (
    <img
      src={sources[0]}
      alt={alt}
      style={{ objectPosition }}
      className={`w-full h-full object-cover ${className}`}
      onError={(e) => {
        const target = e.currentTarget;
        const current = sources.indexOf(target.getAttribute('src') ?? '');
        const next = sources[current + 1];
        if (current >= 0 && next) target.setAttribute('src', next);
      }}
      {...props}
    />
  );
};

export default AssetImage;