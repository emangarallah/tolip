import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import type { StoreSettings } from '../types/store.ts';
import { Language, translations } from '../utils/i18n.ts';

interface HeroProps {
  settings: StoreSettings;
  language: Language;
  onExploreClick: () => void;
  onShopClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  settings,
  language,
  onExploreClick,
  onShopClick,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FFFDFD] via-[#FAF6F3] to-[#FCFCFA] dark:from-[#161A18] dark:via-[#131614] dark:to-[#121513] pt-8 pb-16 lg:pt-14 lg:pb-24 border-b border-[#F0EBE6] dark:border-[#222724] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Text Content Column */}
          <motion.div className="lg:col-span-6 space-y-6 text-start" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.58, ease: "easeOut" }}>
            {/* Subtle editorial kicker */}
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-[#C74169] dark:text-[#E06287] uppercase bg-[#FFF0F4] dark:bg-[#2A161E] px-3.5 py-1.5 rounded-full border border-[#F5E1E8] dark:border-[#3D202B]">
              <Sparkles className="w-3.5 h-3.5 text-[#C74169] dark:text-[#E06287]" />
              <span>{t.brandBadge}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1F2421] dark:text-white tracking-tight leading-[1.25] text-balance">
              {language === 'ar' ? (settings.heroHeadline || t.defaultHeroTitle) : t.defaultHeroTitle}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-[#555C57] dark:text-[#A8B0AA] leading-relaxed max-w-xl text-balance">
              {language === 'ar' ? (settings.heroSubtext || t.defaultHeroSubtext) : t.defaultHeroSubtext}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onShopClick}
                className="px-7 py-3.5 rounded-full text-sm font-semibold text-white bg-[#C74169] hover:bg-[#B3355A] dark:bg-[#D45278] dark:hover:bg-[#C74169] shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 group focus:outline-none"
              >
                <span>{t.shopNow}</span>
                {isRtl ? (
                  <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                ) : (
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                )}
              </button>

              <button
                onClick={onExploreClick}
                className="px-6 py-3.5 rounded-full text-sm font-semibold text-[#1F2421] dark:text-white bg-white dark:bg-[#1C211E] hover:bg-[#F9F7F5] dark:hover:bg-[#252B27] border border-[#E5DFD7] dark:border-[#2D332F] shadow-sm transition-all duration-200 focus:outline-none"
              >
                {t.exploreProducts}
              </button>
            </div>

            {/* Quality & Trust Badges */}
            <div className="pt-6 grid grid-cols-3 gap-3 border-t border-[#EAE3DC] dark:border-[#262C28] text-start">
              <div>
                <p className="text-xs font-bold text-[#1F2421] dark:text-white">{t.natural100}</p>
                <p className="text-[11px] text-[#717772] dark:text-[#8D9690] mt-0.5">{t.natural100Sub}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-[#1F2421] dark:text-white">{t.premiumCare}</p>
                <p className="text-[11px] text-[#717772] dark:text-[#8D9690] mt-0.5">{t.premiumCareSub}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-[#1F2421] dark:text-white">{t.fastOrder}</p>
                <p className="text-[11px] text-[#717772] dark:text-[#8D9690] mt-0.5">{t.fastOrderSub}</p>
              </div>
            </div>
          </motion.div>

          {/* Hero Image Column */}
          <motion.div className="lg:col-span-6 relative" initial={{ opacity: 0, scale: 0.97, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.72, delay: 0.18, ease: "easeOut" }}>
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              {/* Outer soft ambient halo */}
              <div className="absolute -inset-2 bg-gradient-to-tr from-[#FCE8EF]/70 dark:from-[#431B2B]/40 via-[#EBF3ED]/50 dark:via-[#1B3624]/30 to-transparent rounded-3xl blur-xl" />

              {/* Main Image Container */}
              <motion.div whileHover={{ scale: 1.012 }} transition={{ duration: 0.45, ease: "easeOut" }} className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl border border-[#EDE4DE] dark:border-[#2D332F] bg-white dark:bg-[#1A1E1B] aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3]">
                <img
                  src={settings.heroImage || '/src/assets/images/hero_tulip_botanical_1795590417391.jpg'}
                  alt="Tulip Natural Care Collection"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />

                {/* Soft gradient bottom overlay for luxury finish */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                <div className="absolute bottom-4 right-4 left-4 p-4 rounded-xl bg-white/85 dark:bg-[#161917]/85 backdrop-blur-md border border-white/50 dark:border-white/10 text-start shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#1F2421] dark:text-white">{t.yemeniBrandBanner}</p>
                      <p className="text-[11px] text-[#616662] dark:text-[#A8B0AA] mt-0.5">{t.yemeniBrandSub}</p>
                    </div>
                    <span className="text-xs font-semibold text-[#C74169] dark:text-[#E06287] bg-[#FFF0F4] dark:bg-[#2A161E] px-2.5 py-1 rounded-full">
                      توليب
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
