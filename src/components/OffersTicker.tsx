import React, { useEffect, useState } from 'react';
import { Tag, ArrowLeft, ArrowRight } from 'lucide-react';
import type { StoreOffer } from '../types/store.ts';

interface Props {
  language: 'ar' | 'en';
  onClick: () => void;
}

export const OffersTicker: React.FC<Props> = ({ language, onClick }) => {
  const [offers, setOffers] = useState<StoreOffer[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/offers', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : [])
      .then((data) => {
        if (cancelled) return;
        const now = Date.now();
        setOffers(Array.isArray(data) ? data.filter((offer: StoreOffer) =>
          offer.isActive &&
          (!offer.startsAt || Date.parse(offer.startsAt) <= now) &&
          (!offer.endsAt || Date.parse(offer.endsAt) >= now)
        ) : []);
      })
      .catch(() => {
        if (!cancelled) setOffers([]);
      });
    return () => { cancelled = true; };
  }, []);

  if (!offers.length) return null;

  const message = language === 'ar'
    ? `✨ عروض توليب الحالية: ${offers.map((offer) => offer.title).join('  •  ')} — اكتشفي العروض الآن`
    : `✨ Current Tolip offers: ${offers.map((offer) => offer.title).join('  •  ')} — Explore now`;
  const Arrow = language === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={language === 'ar' ? 'عرض العروض الحالية' : 'View current offers'}
      className="group flex w-full items-center gap-3 overflow-hidden border-y border-[#EFCAD7] bg-[#FFF0F5] px-4 py-3 text-start text-[#9F3158] transition-colors hover:bg-[#FCE4ED] dark:border-[#4A2935] dark:bg-[#281820] dark:text-[#F2A9C3] dark:hover:bg-[#33202A]"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <span className="flex shrink-0 items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-extrabold dark:bg-white/10">
        <Tag className="h-4 w-4" />
        {language === 'ar' ? 'عروض اليوم' : 'Offers'}
      </span>
      <span className="relative min-w-0 flex-1 overflow-hidden">
        <span className="offers-ticker-track flex w-max items-center gap-12 whitespace-nowrap text-sm font-semibold">
          <span>{message}</span>
          <span aria-hidden="true">{message}</span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs font-bold">
        {language === 'ar' ? 'تسوقي' : 'Shop'}
        <Arrow className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      </span>
    </button>
  );
};
