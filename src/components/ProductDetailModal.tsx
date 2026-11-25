import React, { useEffect, useState } from 'react';
import { X, Heart, MessageCircle, Plus, Minus, Check, Sparkles, AlertCircle } from 'lucide-react';
import type { Product, ProductVariant } from '../types/store.ts';
import { Language, translations } from '../utils/i18n.ts';

interface ProductDetailModalProps {
  product: Product | null;
  similarProducts: Product[];
  isFavorite: boolean;
  language: Language;
  onClose: () => void;
  onToggleFavorite: (product: Product) => void;
  onOrder: (product: Product, variantId: string, quantity: number) => void;
  onSelectSimilarProduct: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  similarProducts,
  isFavorite,
  language,
  onClose,
  onToggleFavorite,
  onOrder,
  onSelectSimilarProduct,
}) => {
  const t = translations[language];
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    product?.variants[0]?.id || ''
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(0);
  useEffect(() => {
    if (!product) return;
    setSelectedVariantId(product.variants[0]?.id || '');
    setQuantity(1);
    setSelectedImageIdx(0);
  }, [product?.id]);
  const selectedVariant: ProductVariant | undefined =
    product?.variants.find((v) => v.id === selectedVariantId) || product?.variants[0];

  const currentPrice = selectedVariant?.price ?? null;
  const originalPrice = selectedVariant?.originalPrice ?? null;
  const hasDiscount = currentPrice !== null && originalPrice !== null && originalPrice > currentPrice;

  // Total for selected quantity
  const totalPrice = currentPrice !== null ? currentPrice * quantity : null;

  const handleWhatsAppOrder = () => {
    if (!product || !selectedVariant || !product.inStock || selectedVariant.stock <= 0) return;
    onOrder(product, selectedVariant.id, quantity);
  };

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-[#161917] rounded-3xl shadow-2xl border border-[#EFE9E2] dark:border-[#262C28] overflow-hidden my-auto text-start"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 start-4 z-20 p-2.5 rounded-full bg-white/90 dark:bg-[#1C211E]/90 hover:bg-white dark:hover:bg-[#252B27] text-[#4A4E4B] dark:text-[#D1D8D3] hover:text-[#1F2421] dark:hover:text-white shadow-md transition-all focus:outline-none"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 max-h-[85vh] overflow-y-auto">
          {/* Gallery Column (Desktop 6 cols) */}
          <div className="md:col-span-6 p-6 sm:p-8 bg-[#FAF7F3] dark:bg-[#131614] border-b md:border-b-0 md:border-e border-[#F0EBE6] dark:border-[#262C28] flex flex-col justify-between">
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white dark:bg-[#1E2320] shadow-sm border border-[#EFE9E2] dark:border-[#262C28]">
                <img
                  src={
                    product.images[selectedImageIdx] ||
                    product.images[0] ||
                    '/src/assets/images/product_skincare_cream_1795590418002.jpg'
                  }
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-all duration-300"
                />

                {/* Favorite Toggle */}
                <button
                  onClick={() => onToggleFavorite(product)}
                  className={`absolute top-3 end-3 p-2.5 rounded-full shadow-md transition-all ${
                    isFavorite
                      ? 'bg-[#FFF0F4] dark:bg-[#2A161E] text-[#C74169] dark:text-[#E06287]'
                      : 'bg-white/90 dark:bg-[#181C19]/90 text-[#6B7280] dark:text-[#A8B0AA] hover:text-[#C74169] dark:hover:text-[#E06287]'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-[#C74169] dark:fill-[#E06287]' : ''}`} />
                </button>
              </div>

              {/* Thumbnails if multiple images exist */}
              {product.images.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIdx(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                        selectedImageIdx === idx
                          ? 'border-[#C74169] dark:border-[#E06287] ring-2 ring-[#C74169]/20'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Natural Ingredients Guarantee */}
            <div className="mt-6 p-3.5 rounded-2xl bg-white dark:bg-[#191D1A] border border-[#EBE4DC] dark:border-[#262C28] flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#3B6948] dark:text-[#529E67] shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-[#1F2421] dark:text-white">{t.naturalGuarantee}</span>
                <span className="text-[#616662] dark:text-[#A8B0AA] ms-1">
                  {t.naturalGuaranteeDesc}
                </span>
              </div>
            </div>
          </div>

          {/* Details & Purchase Module Column (Desktop 6 cols) */}
          <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-6 bg-white dark:bg-[#161917]">
            <div className="space-y-4">
              {/* Category & Stock Indicator */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#8C4A5E] dark:text-[#E06287] bg-[#FFF0F4] dark:bg-[#2A161E] px-3 py-1 rounded-full">
                  {product.categoryName}
                </span>
                <span
                  className={`font-semibold flex items-center gap-1.5 ${
                    product.inStock ? 'text-[#2D5237] dark:text-[#42E67D]' : 'text-[#DC2626] dark:text-[#F87171]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      product.inStock ? 'bg-[#2D5237] dark:bg-[#42E67D]' : 'bg-[#DC2626] dark:bg-[#F87171]'
                    }`}
                  />
                  <span>{product.inStock ? t.readyToOrder : t.outOfStockNow}</span>
                </span>
              </div>

              {/* Title */}
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1F2421] dark:text-white leading-tight">
                {product.name}
              </h2>

              {/* Price Calculation */}
              <div className="flex items-baseline gap-2 pt-1 pb-3 border-b border-[#F0EBE6] dark:border-[#262C28]">
                {currentPrice !== null ? (
                  <>
                    <span className="text-2xl sm:text-3xl font-black text-[#1F2421] dark:text-white tabular-nums">
                      {(currentPrice * quantity).toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US')}
                    </span>
                    <span className="text-sm font-semibold text-[#717772] dark:text-[#8D9690]">{t.currency}</span>
                    {hasDiscount && (
                      <span className="text-sm text-[#9CA3AF] line-through tabular-nums ms-2">
                        {(originalPrice * quantity).toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US')} {t.currencyShort}
                      </span>
                    )}
                    {quantity > 1 && (
                      <span className="text-xs text-[#8C938E] dark:text-[#78827A] ms-2">
                        ({currentPrice.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US')} {t.currencyShort} {t.perPiece})
                      </span>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#C74169] dark:text-[#E06287] bg-[#FFF0F4] dark:bg-[#2A161E] px-3.5 py-1.5 rounded-xl">
                    <AlertCircle className="w-4 h-4" />
                    <span>{t.consultPriceWhatsApp}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-[#555C57] dark:text-[#A8B0AA] leading-relaxed">
                {product.description}
              </p>

              {/* Variants / Sizes Selection */}
              {product.variants.length > 0 && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-[#1F2421] dark:text-white block">
                    {t.selectSizeOrType}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {product.variants.map((variant) => {
                      const isSelected = selectedVariantId === variant.id;
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => setSelectedVariantId(variant.id)}
                          className={`p-2.5 rounded-xl border text-xs font-semibold transition-all text-center flex flex-col items-center justify-center gap-1 ${
                            isSelected
                              ? 'bg-[#1F2421] text-white border-[#1F2421] dark:bg-[#D45278] dark:border-[#D45278] shadow-sm'
                              : 'bg-white dark:bg-[#1E2320] text-[#374151] dark:text-[#D1D8D3] border-[#E5E0D8] dark:border-[#2D332F] hover:border-[#C74169]'
                          }`}
                        >
                          <span>{variant.name}</span>
                          <span className="text-[11px] opacity-80 tabular-nums">
                            {variant.price !== null
                              ? `${variant.price.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US')} ${t.currencyShort}`
                              : t.determinedAfterAgreement}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Stepper */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-[#1F2421] dark:text-white">{t.quantityRequired}</span>
                <div className="flex items-center border border-[#E5E0D8] dark:border-[#2D332F] rounded-full p-1 bg-white dark:bg-[#1E2320]">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    aria-label="Decrease quantity"
                    className="p-1.5 rounded-full hover:bg-[#F4EFEA] dark:hover:bg-[#282F2B] text-[#1F2421] dark:text-white transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-4 text-sm font-bold tabular-nums min-w-[36px] text-center text-[#1F2421] dark:text-white">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(selectedVariant?.stock || 1, 99, quantity + 1))}
                    aria-label="Increase quantity"
                    className="p-1.5 rounded-full hover:bg-[#F4EFEA] dark:hover:bg-[#282F2B] text-[#1F2421] dark:text-white transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Usage Instructions (if available) */}
              {product.usageInstructions && (
                <div className="p-3.5 rounded-2xl bg-[#F7F5F0] dark:bg-[#1A1E1B] border border-[#EBE4DC] dark:border-[#262C28] text-xs space-y-1">
                  <p className="font-bold text-[#1F2421] dark:text-white">{t.usageMethod}</p>
                  <p className="text-[#555C57] dark:text-[#A8B0AA] leading-relaxed">
                    {product.usageInstructions}
                  </p>
                </div>
              )}

              {/* Features bullets */}
              {product.features && product.features.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs font-bold text-[#1F2421] dark:text-white">{t.productFeatures}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {product.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-[#555C57] dark:text-[#A8B0AA]">
                        <Check className="w-3.5 h-3.5 text-[#3B6948] dark:text-[#529E67] shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Customer details are collected before opening WhatsApp. */}
            <div className="pt-4 border-t border-[#F0EBE6] dark:border-[#262C28] space-y-3">
              <button
                type="button"
                onClick={handleWhatsAppOrder}
                disabled={!product.inStock || !selectedVariant || selectedVariant.stock <= 0}
                className={`w-full py-3.5 px-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  product.inStock
                    ? 'bg-[#25D366] text-white hover:bg-[#20BA57] shadow-md'
                    : 'bg-gray-100 dark:bg-[#222724] text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                <span>{t.orderNowViaWhatsApp}</span>
              </button>

              <p className="text-[11px] text-center text-[#7E8580] dark:text-[#8D9690]">
                {t.codDisclaimer}
              </p>
            </div>
          </div>
        </div>

        {/* Similar Products Recommendation Strip */}
        {similarProducts.length > 0 && (
          <div className="p-6 sm:p-8 bg-[#FAF8F5] dark:bg-[#131614] border-t border-[#F0EBE6] dark:border-[#262C28]">
            <h3 className="text-sm font-bold text-[#1F2421] dark:text-white mb-4">
              {t.similarProductsTitle}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {similarProducts.map((sim) => (
                <div
                  key={sim.id}
                  onClick={() => onSelectSimilarProduct(sim)}
                  className="cursor-pointer bg-white dark:bg-[#191D1A] p-3 rounded-xl border border-[#EFE9E2] dark:border-[#262C28] hover:border-[#C74169] dark:hover:border-[#E06287] transition-all flex flex-col gap-2 group"
                >
                  <div className="aspect-square w-full rounded-lg overflow-hidden bg-[#F7F4F0] dark:bg-[#202522]">
                    <img
                      src={sim.images[0]}
                      alt={sim.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h4 className="text-xs font-bold text-[#1F2421] dark:text-white group-hover:text-[#C74169] dark:group-hover:text-[#E06287] truncate">
                    {sim.name}
                  </h4>
                  <span className="text-[11px] text-[#616662] dark:text-[#A8B0AA] tabular-nums">
                    {sim.variants[0]?.price !== null && sim.variants[0]?.price !== undefined
                      ? `${sim.variants[0].price.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US')} ${t.currencyShort}`
                      : t.contactForPrice}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
