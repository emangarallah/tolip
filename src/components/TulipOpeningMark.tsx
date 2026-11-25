import React from 'react';

export const TulipOpeningMark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <img
    src="/tulip-original-logo.svg"
    alt="شعار توليب الأصلي: اليد تحمل عبوة العناية محاطة بالنباتات، مع اسم توليب ووصف منتجات العناية بالبشرة والجسم"
    className={className}
    width="420"
    height="420"
    decoding="async"
  />
);
