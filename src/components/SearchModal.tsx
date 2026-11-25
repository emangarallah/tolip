import React, { useState, useEffect } from 'react';
import { X, Search, ArrowLeft, ArrowRight } from 'lucide-react';
import type { Product, Category } from '../types/store.ts';
import { Language, translations } from '../utils/i18n.ts';

interface SearchModalProps {
  isOpen: boolean;
  categories: Category[];
  language: Language;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  categories,
  language,
  onClose,
  onSelectProduct,
}) => {
  if (!isOpen) return null;

  const t = translations[language];
  const isRtl = language === 'ar';
  const [query, setQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.append('search', query.trim());
        if (selectedCat !== 'all') params.append('categoryId', selectedCat);

        const res = await fetch(`/api/products?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchResults, 250);
    return () => clearTimeout(timer);
  }, [query, selectedCat]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 dark:bg-black/75 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 pt-16 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#161917] rounded-3xl shadow-2xl border border-[#EFE9E2] dark:border-[#262C28] overflow-hidden my-auto text-start"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 sm:p-5 border-b border-[#F0EBE6] dark:border-[#262C28] flex items-center gap-3">
          <Search className="w-5 h-5 text-[#C74169] dark:text-[#E06287] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="flex-1 bg-transparent text-sm sm:text-base text-[#1F2421] dark:text-white placeholder-[#9CA3AF] dark:placeholder-[#78827A] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-[#9CA3AF] dark:text-[#78827A] hover:text-[#1F2421] dark:hover:text-white px-2 py-1"
            >
              {language === 'ar' ? 'مسح' : 'Clear'}
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
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
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCat === 'all'
                ? 'bg-[#1F2421] text-white dark:bg-[#D45278] shadow-sm'
                : 'bg-white dark:bg-[#1E2320] text-[#555C57] dark:text-[#D1D8D3] border border-[#E5DFD7] dark:border-[#2D332F] hover:border-[#1F2421]'
            }`}
          >
            {t.allCategories}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCat(c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCat === c.id
                  ? 'bg-[#1F2421] text-white dark:bg-[#D45278] shadow-sm'
                  : 'bg-white dark:bg-[#1E2320] text-[#555C57] dark:text-[#D1D8D3] border border-[#E5DFD7] dark:border-[#2D332F] hover:border-[#1F2421]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-[#717772] dark:text-[#8D9690]">
              {language === 'ar' ? 'جاري البحث عن المنتجات...' : 'Searching products...'}
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm font-bold text-[#1F2421] dark:text-white">{t.noProductsFound}</p>
              <p className="text-xs text-[#717772] dark:text-[#8D9690]">
                {language === 'ar' ? 'جربي البحث بكلمات أخرى أو تصفحي جميع الأقسام.' : 'Try different keywords or browse all categories.'}
              </p>
            </div>
          ) : (
            results.map((prod) => {
              const price = prod.variants[0]?.price;
              return (
                <div
                  key={prod.id}
                  onClick={() => {
                    onClose();
                    onSelectProduct(prod);
                  }}
                  className="p-3 rounded-2xl border border-[#EFE9E2] dark:border-[#262C28] hover:border-[#C74169] dark:hover:border-[#E06287] bg-white dark:bg-[#191D1A] hover:bg-[#FFFDFD] dark:hover:bg-[#202522] transition-all cursor-pointer flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#FAF7F3] dark:bg-[#222724] border border-[#EFE9E2] dark:border-[#2D332F] shrink-0">
                      <img
                        src={prod.images[0]}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-[#C74169] dark:text-[#E06287] font-medium truncate">
                        {prod.categoryName}
                      </p>
                      <h4 className="text-sm font-bold text-[#1F2421] dark:text-white group-hover:text-[#C74169] dark:group-hover:text-[#E06287] truncate">
                        {prod.name}
                      </h4>
                      <p className="text-xs text-[#717772] dark:text-[#8D9690] tabular-nums mt-0.5">
                        {price !== null && price !== undefined
                          ? `${price.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US')} ${t.currencyShort}`
                          : t.contactForPrice}
                      </p>
                    </div>
                  </div>

                  {isRtl ? (
                    <ArrowLeft className="w-4 h-4 text-[#C74169] dark:text-[#E06287] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-[#C74169] dark:text-[#E06287] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
