import React from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

interface MagneticCtaProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}

const SPRING = { stiffness: 280, damping: 18, mass: 0.35 } as const;

/**
 * Magnetic snap CTA. The hit target follows the pointer, then springs home.
 * Pattern used by Build in Amsterdam and OFF+BRAND flagship work.
 */
export const MagneticCta: React.FC<MagneticCtaProps> = ({
  children,
  onClick,
  className = '',
  ariaLabel,
}) => {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, SPRING);
  const springY = useSpring(y, SPRING);

  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      onMouseMove={(event) => {
        if (reduced) return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.set((event.clientX - rect.left - rect.width / 2) * 0.42);
        y.set((event.clientY - rect.top - rect.height / 2) * 0.42);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      style={{
        x: reduced ? 0 : springX,
        y: reduced ? 0 : springY,
      }}
      className={`flagship-gpu relative cursor-pointer border-0 font-mono text-[11px] font-medium uppercase tracking-telemetry focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00] ${className}`}
    >
      {children}
    </motion.button>
  );
};

export default MagneticCta;
