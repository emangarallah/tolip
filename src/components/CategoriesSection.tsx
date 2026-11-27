import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import type { Category } from '../types/store.ts';
import { Language, translations } from '../utils/i18n.ts';

interface CategoriesSectionProps {
  categories: Category[];
  selectedCategoryId?: string;
  language: Language;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoriesSection: React.FC<CategoriesSectionProps> = ({
  categories,
  selectedCategoryId,
  language,
  onSelectCategory,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  return (
    <section className="py-14 sm:py-20 bg-[#FCFCFA] dark:bg-[#121513] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 text-start">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-[#3B6948] dark:text-[#529E67] bg-[#F0F5F1] dark:bg-[#1A2E20] px-3 py-1 rounded-full mb-3 border border-[#E0EBE2] dark:border-[#2A4833]">
              <Sparkles className="w-3.5 h-3.5 text-[#3B6948] dark:text-[#529E67]" />
              <span>{t.curatedCollections}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1F2421] dark:text-white tracking-tight">
              {t.storeCategories}
            </h2>
          </div>
          <p className="text-sm text-[#555C57] dark:text-[#A8B0AA] max-w-md">
            {t.categoriesSub}
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((category) => {
            const isSelected = selectedCategoryId === category.id;
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.12 }}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.975, y: -2, transition: { duration: 0.16, ease: "easeOut" } }}
                transition={{ duration: 0.38, ease: "easeOut" }}
                onClick={() => onSelectCategory(category.id)}
                className={`group cursor-pointer rounded-2xl overflow-hidden bg-white dark:bg-[#191D1A] border transition-all duration-300 flex flex-col justify-between text-start ${
                  isSelected
                    ? 'border-[#C74169] dark:border-[#E06287] ring-2 ring-[#C74169]/20 shadow-md'
                    : 'border-[#EFE9E2] dark:border-[#262C28] hover:border-[#D9CFC5] dark:hover:border-[#3B443E] hover:shadow-md'
                }`}
              >
                {/* Category Image */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F7F4F0] dark:bg-[#202522]">
                  <motion.img
                    src={category.image}
                    alt={category.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    whileTap={{ scale: 1.07 }}
                    transition={{ duration: 0.32, ease: "easeOut" }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-85 group-hover:opacity-95 transition-opacity" />

                  {/* Product count badge */}
                  {category.productCount !== undefined && (
                    <div className="absolute top-3 left-3 bg-white/90 dark:bg-[#121513]/90 backdrop-blur-sm text-[#1F2421] dark:text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                      {category.productCount} {t.itemsCount}
                    </div>
                  )}

                  {/* Category Title on image bottom */}
                  <div className="absolute bottom-3 right-3 left-3 text-white">
                    <h3 className="text-base sm:text-lg font-bold leading-snug drop-shadow-sm">
                      {category.name}
                    </h3>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-3 bg-white dark:bg-[#191D1A]">
                  <p className="text-xs text-[#6B7280] dark:text-[#9DA6A0] line-clamp-2 leading-relaxed">
                    {category.description}
                  </p>

                  <div className="pt-2 border-t border-[#F2ECE6] dark:border-[#262C28] flex items-center justify-between text-xs font-semibold text-[#C74169] dark:text-[#E06287] group-hover:text-[#B3355A]">
                    <span>{t.exploreCategory}</span>
                    {isRtl ? (
                      <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
