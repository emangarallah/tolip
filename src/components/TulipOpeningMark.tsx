import React from 'react';

export const TulipOpeningMark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <img
    src="/images/tolip-logo.jpg"
    alt="شعار توليب للعناية بالبشرة والجسم"
    className={className}
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
);
