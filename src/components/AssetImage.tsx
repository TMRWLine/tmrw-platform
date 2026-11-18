import React, { useState } from 'react';

export interface AssetImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  file?: string;
  fallbackFiles?: readonly string[];
  alt: string;
  objectPosition?: string;
}

export const AssetImage: React.FC<AssetImageProps> = ({
  file,
  fallbackFiles = [],
  alt,
  objectPosition,
  className = '',
  onError,
  ...props
}) => {
  const candidates = [...new Set([file, ...fallbackFiles].filter((value): value is string => Boolean(value)))];
  const key = candidates.join('|');
  const [failure, setFailure] = useState({ key, index: 0 });
  const index = failure.key === key ? failure.index : 0;
  const source = candidates[index];
  const src = source && (/^https?:\/\//i.test(source) || source.startsWith('/') ? source : `/${source}`);

  if (!src) {
    return <span role="img" aria-label={alt} className={`asset-unavailable ${className}`}>{alt}</span>;
  }

  return (
    <img
      src={src}
      alt={alt}
      style={{ objectPosition }}
      className={`w-full h-full object-cover ${className}`}
      onError={(e) => {
        setFailure({ key, index: index + 1 });
        onError?.(e);
      }}
      {...props}
    />
  );
};

export default AssetImage;