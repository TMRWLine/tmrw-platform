import React from 'react';

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
  ...props
}) => {
  // Gracefully fallback if file is undefined or empty
  const safeFile = file && typeof file === 'string' ? file : 'placeholder.jpg';
  const src = safeFile.startsWith('http') || safeFile.startsWith('/') ? safeFile : `/${safeFile}`;

  return (
    <img
      src={src}
      alt={alt}
      style={{ objectPosition }}
      className={`w-full h-full object-cover ${className}`}
      onError={(e) => {
        // Try fallback files if primary fails
        const target = e.target as HTMLImageElement;
        if (fallbackFiles.length > 0) {
          const nextFile = fallbackFiles[0];
          target.src = nextFile.startsWith('/') ? nextFile : `/${nextFile}`;
        }
      }}
      {...props}
    />
  );
};

export default AssetImage;