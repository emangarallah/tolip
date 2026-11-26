import React from 'react';
import { motion } from 'motion/react';

export const TulipOpeningMark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <motion.span className="tulip-opening-3d" aria-hidden="false" initial={{ opacity: 0, y: 18, rotateX: -10, scale: 0.88 }} animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }} transition={{ type: "spring", stiffness: 90, damping: 16, duration: 0.9 }}>
  <motion.img
    src="/images/tolip-logo.png"
    alt="شعار توليب للعناية بالبشرة والجسم"
    className={`${className} tulip-opening-logo`}
    animate={{ y: [0, -3, 0] }}
    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}
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
  </motion.span>
);
