import React from 'react';
import { X, ShoppingCart, Trash2, Plus, Minus, ArrowLeft } from 'lucide-react';
import type { Product, OrderDraftItem } from '../types/store.ts';
import { Language, translations } from '../utils/i18n.ts';

export interface CartLine {
  productId: string;
  variantId: string;
  quantity: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  products: Product[];
  lines: CartLine[];
  language: Language;
  onClose: () => void;
  onUpdate: (productId: string, variantId: string, quantity: number) => void;
  onVariantChange: (productId: string, oldVariantId: string, newVariantId: string, quantity: number) => void;
  onRemove: (productId: string, variantId: string) => void;
  onCheckout: (items: OrderDraftItem[]) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen, products, lines, language, onClose, onUpdate, onVariantChange, onRemove, onCheckout,
}) => {
  const t = translations[language];
  if (!isOpen) return null;

  const resolved = lines.map((line) => {
    const product = products.find((item) => item.id === line.productId);
    const variant = product?.variants.find((item) => item.id === line.variantId);
    return { line, product, variant };
  }).filter((entry): entry is { line: CartLine; product: Product; variant: Product['variants'][number] } => Boolean(entry.product && entry.variant));

  const total = resolved.every(({ variant }) => variant.price !== null)
    ? resolved.reduce((sum, { variant, line }) => sum + (variant.price ?? 0) * line.quantity, 0)
    : null;

  const draftItems: OrderDraftItem[] = resolved.map(({ product, variant, line }) => ({
    id: `${product.id}_${variant.id}`,
    productId: product.id,
    productName: product.name,
    variantId: variant.id,
    variantName: variant.name,
    price: variant.price,
    quantity: line.quantity,
    image: product.images[0] || '',
    categoryName: product.categoryName,
  }));

  return (
    <div className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm flex justify-end" onClick={onClose}>
      <aside className="h-full w-full max-w-lg bg-[#FFF9F7] dark:bg-[#151916] shadow-2xl flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'} onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between p-5 border-b border-[#F0EBE6] dark:border-[#2A302C]">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-[#C74169]" />
            <div>
              <h2 className="font-bold text-lg text-[#5B2638] dark:text-white">{language === 'ar' ? 'سلة مشترياتك' : 'Your cart'}</h2>
              <p className="text-xs text-[#8A737B]">{language === 'ar' ? `${resolved.length} منتجات` : `${resolved.length} items`}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close cart" className="p-2 rounded-full hover:bg-white dark:hover:bg-[#242B26]"><X className="w-5 h-5"/></button>
        </header>

        {resolved.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
            <ShoppingCart className="w-12 h-12 text-[#D8B8C4]" />
            <p className="font-semibold text-[#5B2638] dark:text-white">{language === 'ar' ? 'السلة فارغة' : 'Your cart is empty'}</p>
            <button onClick={onClose} className="text-sm font-bold text-[#C74169]">{language === 'ar' ? 'متابعة التسوق' : 'Continue shopping'}</button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {resolved.map(({ line, product, variant }) => (
                <article key={`${line.productId}_${line.variantId}`} className="rounded-2xl border border-[#EFE9E2] dark:border-[#2A302C] bg-white dark:bg-[#1B211D] p-3 flex gap-3">
                  <img src={product.images[0] || ''} alt={product.name} className="w-20 h-20 rounded-xl object-cover bg-[#FAF7F2]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[#33252A] dark:text-white line-clamp-2">{product.name}</h3>
                        <select value={line.variantId} onChange={(e) => onVariantChange(line.productId, line.variantId, e.target.value, line.quantity)} aria-label={language === 'ar' ? 'اختيار الحجم أو النوع' : 'Choose variant'} className="mt-1 max-w-full rounded-lg border border-[#E7DDE0] dark:border-[#343C36] bg-white dark:bg-[#202622] px-2 py-1 text-[11px] text-[#6F5B63] dark:text-[#C0C9C2]">
                          {product.variants.filter((entry) => entry.stock > 0).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}{entry.price !== null ? ` — ${entry.price.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US')} ${t.currencyShort}` : ''}</option>)}
                        </select>
                      </div>
                      <button onClick={() => onRemove(line.productId, line.variantId)} aria-label="Remove item" className="p-1.5 text-[#A85C72] hover:bg-[#FFF0F4] rounded-lg"><Trash2 className="w-4 h-4"/></button>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-3">
                      <div className="flex items-center gap-2 border border-[#E7DDE0] dark:border-[#343C36] rounded-lg p-1">
                        <button onClick={() => onUpdate(line.productId, line.variantId, Math.max(1, line.quantity - 1))} aria-label="Decrease quantity" className="p-1"><Minus className="w-3.5 h-3.5"/></button>
                        <span className="text-xs font-bold tabular-nums min-w-4 text-center">{line.quantity}</span>
                        <button onClick={() => onUpdate(line.productId, line.variantId, Math.min(variant.stock, 99, line.quantity + 1))} disabled={line.quantity >= variant.stock} aria-label="Increase quantity" className="p-1 disabled:opacity-30"><Plus className="w-3.5 h-3.5"/></button>
                      </div>
                      <span className="text-xs font-extrabold text-[#5B2638] dark:text-white tabular-nums">{variant.price !== null ? `${(variant.price * line.quantity).toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US')} ${t.currencyShort}` : t.contactForPrice}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <footer className="p-5 border-t border-[#F0EBE6] dark:border-[#2A302C] bg-white dark:bg-[#171C18] space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#8A737B]">{language === 'ar' ? 'إجمالي المنتجات' : 'Subtotal'}</span>
                <strong className="text-[#5B2638] dark:text-white">{total !== null ? `${total.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US')} ${t.currencyShort}` : t.determinedAfterAgreement}</strong>
              </div>
              <p className="text-[11px] text-[#8A737B]">{language === 'ar' ? 'رسوم التوصيل تُحسب عند إدخال عنوانك.' : 'Delivery is calculated after entering your address.'}</p>
              <button onClick={() => onCheckout(draftItems)} disabled={!draftItems.length} className="w-full rounded-xl bg-[#C74169] hover:bg-[#B3355A] text-white py-3.5 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {language === 'ar' ? 'إتمام الطلب' : 'Checkout'} <ArrowLeft className="w-4 h-4"/>
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
};
