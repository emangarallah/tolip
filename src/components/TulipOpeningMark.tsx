import React from 'react';
import { motion } from 'motion/react';

export const TulipOpeningMark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <motion.span
    className="tulip-opening-3d"
    aria-hidden="false"
    initial={{ opacity: 0, y: 18, rotateX: -10, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
    transition={{ type: "spring", stiffness: 85, damping: 17, duration: 1 }}
  >
    <motion.span
      aria-hidden="true"
      className="tulip-opening-aura"
      animate={{ opacity: [0.12, 0.42, 0.12], scale: [0.88, 1.12, 0.88] }}
      transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
    />
    <motion.img
      src="/images/tolip-logo.png"
      alt="شعار توليب للعناية بالبشرة والجسم"
      className={`${className} tulip-opening-logo`}
      animate={{
        y: [0, -5, 0],
        scale: [1, 1.028, 1],
        rotateZ: [0, 1.1, 0, -1.1, 0],
      }}
      transition={{
        y: { duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 },
        scale: { duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 },
        rotateZ: { duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.8 },
      }}
    width="420"
    height="420"
    decoding="async"
    onError={(event) => {
      // Keep the existing opening screen working if the uploaded logo is unavailable.
      const image = event.currentTarget;
      if (image.dataset.fallbackApplied !== 'true') {
        image.dataset.fallbackApplied = 'true';
        image.src = '/tulip-original-logo.svg';
      }
    }}
    />
    <motion.span
      aria-hidden="true"
      className="tulip-opening-shimmer"
      animate={{ x: ['-130%', '360%'], opacity: [0, 0.85, 0] }}
      transition={{ duration: 1.35, repeat: Infinity, repeatDelay: 5.8, ease: "easeInOut", delay: 2 }}
    />
  </motion.span>
);
