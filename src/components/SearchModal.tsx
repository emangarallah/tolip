import React, { useMemo, useState } from 'react';
import { X, Search, ArrowLeft, ArrowRight } from 'lucide-react';
import type { Product, Category } from '../types/store.ts';
import { Language, translations } from '../utils/i18n.ts';

interface SearchModalProps {
  isOpen: boolean;
  products: Product[];
  categories: Category[];
  language: Language;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  products,
  categories,
  language,
  onClose,
  onSelectProduct,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';
  const [query, setQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');

  // Normalize Arabic spelling/diacritics and English casing consistently.
  const normalizeSearchText = (value: unknown) =>
    String(value ?? '')
      .normalize('NFKC')
      .toLocaleLowerCase(language)
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/\s+/g, ' ')
      .trim();

  const normalizedQuery = normalizeSearchText(query);
  const results = useMemo(() => {
    const tokens = normalizedQuery.split(' ').filter(Boolean);

    return products.filter((product) => {
      if (selectedCat !== 'all' && product.categoryId !== selectedCat) return false;
      if (tokens.length === 0) return true;

      const searchableText = normalizeSearchText([
        product.name,
        product.slug,
        product.description,
        product.categoryName,
        ...(product.features ?? []),
        ...(product.variants ?? []).flatMap((variant) => [
          variant.name,
          variant.sku,
          variant.price,
          variant.originalPrice,
          variant.stock,
        ]),
      ].filter((value) => value !== null && value !== undefined).join(' '));

      // Allow different words in a query to match different product fields.
      return tokens.every((token) => searchableText.includes(token));
    });
  }, [products, selectedCat, normalizedQuery, language]);

  if (!isOpen) return null;

  return (
    <div
      id="tolip-product-search"
      role="dialog"
      aria-modal="true"
      aria-label={language === 'ar' ? 'البحث عن المنتجات' : 'Search products'}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 dark:bg-black/75 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 pt-16 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#161917] rounded-3xl shadow-2xl border border-[#EFE9E2] dark:border-[#262C28] overflow-hidden my-auto text-start"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 sm:p-5 border-b border-[#F0EBE6] dark:border-[#262C28] flex items-center gap-3">
          <Search className="w-5 h-5 text-[#C74169] dark:text-[#E06287] shrink-0" />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={language === 'ar' ? 'اكتبي اسم المنتج أو وصفه' : 'Enter a product name or description'}
            className="flex-1 min-w-0 bg-transparent text-sm sm:text-base text-[#1F2421] dark:text-white placeholder-[#9CA3AF] dark:placeholder-[#78827A] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={language === 'ar' ? 'مسح البحث' : 'Clear search'}
              className="text-xs text-[#9CA3AF] dark:text-[#78827A] hover:text-[#1F2421] dark:hover:text-white px-2 py-1"
            >
              {language === 'ar' ? 'مسح' : 'Clear'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={language === 'ar' ? 'إغلاق البحث' : 'Close search'}
            className="p-1.5 rounded-full hover:bg-[#F4EFEA] dark:hover:bg-[#1E2320] text-[#6B7280] dark:text-[#A8B0AA] hover:text-[#1F2421] dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filters Pills */}
        <div className="p-3 bg-[#FAF8F5] dark:bg-[#131614] border-b border-[#F0EBE6] dark:border-[#262C28] flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCat('all')}
            aria-pressed={selectedCat === 'all'}
            className={selectedCat === 'all'
              ? 'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors bg-[#1F2421] text-white dark:bg-[#D45278] shadow-sm'
              : 'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors bg-white dark:bg-[#1E2320] text-[#555C57] dark:text-[#D1D8D3] border border-[#E5DFD7] dark:border-[#2D332F] hover:border-[#1F2421]'}
          >
            {t.allCategories}
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCat(category.id)}
              aria-pressed={selectedCat === category.id}
              className={selectedCat === category.id
                ? 'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors bg-[#1F2421] text-white dark:bg-[#D45278] shadow-sm'
                : 'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors bg-white dark:bg-[#1E2320] text-[#555C57] dark:text-[#D1D8D3] border border-[#E5DFD7] dark:border-[#2D332F] hover:border-[#1F2421]'}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2" aria-live="polite">
          {results.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm font-bold text-[#1F2421] dark:text-white">{t.noProductsFound}</p>
              <p className="text-xs text-[#717772] dark:text-[#8D9690]">
                {language === 'ar'
                  ? 'جربي كلمات أخرى أو اختاري قسماً مختلفاً.'
                  : 'Try different keywords or choose another category.'}
              </p>
            </div>
          ) : (
            results.map((product) => {
              const price = product.variants?.[0]?.price;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectProduct(product);
                  }}
                  className="w-full text-start p-3 rounded-2xl border border-[#EFE9E2] dark:border-[#262C28] hover:border-[#C74169] dark:hover:border-[#E06287] bg-white dark:bg-[#191D1A] hover:bg-[#FFFDFD] dark:hover:bg-[#202522] transition-all cursor-pointer flex items-center justify-between gap-4 group"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="w-14 h-14 rounded-xl overflow-hidden bg-[#FAF7F3] dark:bg-[#222724] border border-[#EFE9E2] dark:border-[#2D332F] shrink-0">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11px] text-[#C74169] dark:text-[#E06287] font-medium truncate">
                        {product.categoryName || categories.find((category) => category.id === product.categoryId)?.name || ''}
                      </span>
                      <span className="block text-sm font-bold text-[#1F2421] dark:text-white group-hover:text-[#C74169] dark:group-hover:text-[#E06287] truncate">
                        {product.name}
                      </span>
                      <span className="block text-xs text-[#717772] dark:text-[#8D9690] tabular-nums mt-0.5">
                        {price !== null && price !== undefined
                          ? price.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US') + ' ' + t.currencyShort
                          : t.contactForPrice}
                      </span>
                    </span>
                  </span>

                  {isRtl ? (
                    <ArrowLeft className="w-4 h-4 text-[#C74169] dark:text-[#E06287] shrink-0" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-[#C74169] dark:text-[#E06287] shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
