import React from 'react';

const MARK = 'h-6 max-h-6 w-auto object-contain brightness-0';

interface CarrierMarkProps {
  src: string;
  alt: string;
}

const CarrierMark: React.FC<CarrierMarkProps> = ({ src, alt }) => (
  <img src={src} alt={alt} className={MARK} />
);

/** Monochrome carrier marks for the Page Two rail. Source files are mapped from public/logos/. */

export const ChannelNineMark: React.FC = () => (
  <CarrierMark src="/logos/National_Nine_Network_Logo_1969.svg" alt="Channel 9" />
);

export const StanSportMark: React.FC = () => (
  <CarrierMark src="/logos/stan-sport-wordmark.svg" alt="Stan Sport" />
);

export const KayoMark: React.FC = () => (
  <CarrierMark src="/logos/kayo-sports-seeklogo.png" alt="Kayo Sports" />
);

export const TenPlayMark: React.FC = () => (
  <CarrierMark src="/logos/10-play-seeklogo.svg" alt="10 Play" />
);

export const SevenPlusMark: React.FC = () => (
  <CarrierMark src="/logos/7plus-wordmark.svg" alt="7plus" />
);

export const SkySportNzMark: React.FC = () => (
  <CarrierMark src="/logos/Sky_Sport_NZ_2019.svg.webp" alt="Sky Sport NZ" />
);
