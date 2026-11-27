import React from 'react';
import { motion } from 'motion/react';
import { Heart, MessageCircle, Eye } from 'lucide-react';
import type { Product } from '../types/store.ts';
import { Language, translations } from '../utils/i18n.ts';

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  language: Language;
  onToggleFavorite: (product: Product) => void;
  onViewDetails: (product: Product) => void;
  onOrder: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isFavorite,
  language,
  onToggleFavorite,
  onViewDetails,
  onOrder,
}) => {
  const t = translations[language];

  // Determine pricing display
  const primaryVariant = product.variants[0];
  const hasVariants = product.variants.length > 1;

  // Find lowest price
  const prices = product.variants.map((v) => v.price).filter((p): p is number => p !== null);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const originalPrice = primaryVariant?.originalPrice;

  // Has discount?
  const hasDiscount = minPrice !== null && originalPrice && originalPrice > minPrice;
  const hasAvailableVariant = product.variants.some((variant) => variant.stock > 0);
  const isAvailable = hasAvailableVariant;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} whileHover={{ y: -5 }} whileTap={{ scale: 0.975, y: -2, transition: { duration: 0.16, ease: "easeOut" } }} transition={{ duration: 0.38, ease: "easeOut" }} className="group relative rounded-2xl bg-white dark:bg-[#181C19] border border-[#EFE9E2] dark:border-[#262C28] hover:border-[#DFCFC3] dark:hover:border-[#3B443E] hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden text-start">
      {/* Top Image Area */}
      <div
        className="relative aspect-[4/3] w-full bg-[#FAF7F2] dark:bg-[#202522] overflow-hidden cursor-pointer"
        onClick={() => onViewDetails(product)}
      >
        <motion.img
          src={product.images[0] || '/src/assets/images/product_skincare_cream_1795590418002.jpg'}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          whileTap={{ scale: 1.07 }}
          transition={{ duration: 0.48, ease: 'easeOut' }}
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product);
          }}
          aria-label={isFavorite ? t.favorites : t.favorites}
          className={`absolute top-3 start-3 p-2 rounded-full transition-all duration-200 z-10 ${
            isFavorite
              ? 'bg-[#FFF0F4] dark:bg-[#2A161E] text-[#C74169] dark:text-[#E06287] shadow-sm'
              : 'bg-white/80 dark:bg-[#141715]/80 text-[#6B7280] dark:text-[#A8B0AA] hover:text-[#C74169] dark:hover:text-[#E06287] hover:bg-white dark:hover:bg-[#1A1E1B] shadow-sm'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-[#C74169] dark:fill-[#E06287]' : ''}`} />
        </button>

        {/* Discount or Best Seller Tag */}
        <div className="absolute top-3 end-3 flex flex-col gap-1 z-10">
          {hasDiscount && (
            <span className="bg-[#C74169] text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              {t.specialDiscount}
            </span>
          )}
          {product.isBestSeller && !hasDiscount && (
            <span className="bg-[#3B6948] text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              {t.mostRequested}
            </span>
          )}
        </div>

        {/* Quick View Overlay on hover */}
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="bg-white/95 dark:bg-[#161917]/95 backdrop-blur-sm text-[#1F2421] dark:text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span>{t.viewDetails}</span>
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between bg-white dark:bg-[#181C19]">
        <div>
          {/* Category & Status */}
          <div className="flex items-center justify-between text-xs text-[#717772] dark:text-[#8D9690] mb-1.5">
            <span className="hover:text-[#1F2421] dark:hover:text-white transition-colors">
              {product.categoryName}
            </span>
            <span className={isAvailable ? 'text-[#2D5237] dark:text-[#42E67D]' : 'text-[#DC2626] dark:text-[#F87171]'}>
              {isAvailable ? t.inStock : t.outOfStock}
            </span>
          </div>

          {/* Product Title */}
          <h3
            onClick={() => onViewDetails(product)}
            className="text-base font-bold text-[#1F2421] dark:text-white hover:text-[#C74169] dark:hover:text-[#E06287] cursor-pointer transition-colors leading-snug line-clamp-1"
          >
            {product.name}
          </h3>

          {/* Short description */}
          <p className="text-xs text-[#6B7280] dark:text-[#9DA6A0] line-clamp-2 mt-1 leading-relaxed">
            {product.description}
          </p>

          {/* Variants count indicator */}
          {hasVariants && (
            <p className="text-[11px] text-[#8C938E] dark:text-[#78827A] mt-2">
              {t.availableVariants.replace('{count}', String(product.variants.length))}
            </p>
          )}
        </div>

        {/* Pricing & Actions */}
        <div className="pt-4 mt-3 border-t border-[#F2ECE6] dark:border-[#262C28] space-y-3">
          {/* Price */}
          <div className="flex items-baseline gap-2">
            {minPrice !== null ? (
              <>
                <span className="text-lg font-extrabold text-[#1F2421] dark:text-white tabular-nums">
                  {hasVariants ? t.startsFrom : ''}
                  {minPrice.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US')}
                </span>
                <span className="text-xs font-medium text-[#717772] dark:text-[#8D9690]">{t.currency}</span>
                {originalPrice && originalPrice > minPrice && (
                  <span className="text-xs text-[#9CA3AF] line-through tabular-nums ms-1">
                    {originalPrice.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US')} {t.currencyShort}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs font-semibold text-[#8C4A5E] dark:text-[#E06287]">
                {t.contactForPrice}
              </span>
            )}
          </div>

          {/* Single order action: product details allow the customer to choose a size before delivery details. */}
          <div className="grid grid-cols-1 gap-2">
            <button type="button" onClick={() => onOrder(product)} disabled={!isAvailable} className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-xs font-bold transition-all ${isAvailable ? "bg-[#25D366] text-white hover:bg-[#20BA57] shadow-sm" : "bg-gray-100 dark:bg-[#222724] text-gray-400 dark:text-gray-600 cursor-not-allowed"}`}>
              <MessageCircle className="w-4 h-4" /><span>{language === "ar" ? "اطلب الآن" : "Order now"}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
