import React from 'react';
import { motion } from 'motion/react';

export const TulipOpeningMark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <motion.span
    className="tulip-opening-3d"
    aria-hidden="false"
    initial={{ opacity: 0, y: 10, scale: 0.96 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
  >
    <motion.span
      aria-hidden="true"
      className="tulip-opening-aura"
      animate={{ opacity: [0.18, 0.3, 0.18], scale: [0.96, 1.04, 0.96] }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
    />
    <motion.img
      src="/images/tolip-logo.png"
      alt="شعار توليب للعناية بالبشرة والجسم"
      className={`${className} tulip-opening-logo`}
      animate={{
        y: [0, -2.5, 0],
        scale: [1, 1.015, 1],
      }}
      transition={{
        y: { duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 },
        scale: { duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 },
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
      animate={{ x: ['-130%', '360%'], opacity: [0, 0.3, 0] }}
      transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 12, ease: "easeInOut", delay: 2 }}
    />
  </motion.span>
);
