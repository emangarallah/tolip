import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ArrowRight, MessageCircle } from 'lucide-react';
import type { CartItem, StoreSettings } from '../types/store.ts';
import { Language, translations } from '../utils/i18n.ts';

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  settings: StoreSettings;
  language: Language;
  onClose: () => void;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
  onBrowseProducts: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  items,
  settings,
  language,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout,
  onBrowseProducts,
}) => {
  if (!isOpen) return null;

  const t = translations[language];
  const isRtl = language === 'ar';

  // Calculate items subtotal
  let itemsTotal: number | null = 0;
  let hasConsultationItem = false;

  for (const item of items) {
    if (item.price === null) {
      hasConsultationItem = true;
    } else if (itemsTotal !== null) {
      itemsTotal += item.price * item.quantity;
    }
  }

  if (hasConsultationItem) {
    itemsTotal = null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 dark:bg-black/70 backdrop-blur-sm flex justify-start animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-[#161917] h-full shadow-2xl flex flex-col justify-between text-start border-s border-[#EFE9E2] dark:border-[#262C28] animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#F0EBE6] dark:border-[#262C28] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#C74169] dark:text-[#E06287]" />
            <h2 className="text-lg font-bold text-[#1F2421] dark:text-white">{t.shoppingBag}</h2>
            <span className="text-xs bg-[#FFF0F4] dark:bg-[#2A161E] text-[#C74169] dark:text-[#E06287] font-bold px-2 py-0.5 rounded-full">
              {items.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close cart"
            className="p-2 rounded-full hover:bg-[#F4EFEA] dark:hover:bg-[#1C211E] text-[#6B7280] dark:text-[#A8B0AA] hover:text-[#1F2421] dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#FFF0F4] dark:bg-[#2A161E] flex items-center justify-center text-[#C74169] dark:text-[#E06287]">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-[#1F2421] dark:text-white">{t.emptyCartTitle}</p>
                <p className="text-xs text-[#717772] dark:text-[#8D9690]">
                  {t.emptyCartDesc}
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onBrowseProducts();
                }}
                className="mt-2 px-6 py-2.5 rounded-full bg-[#1F2421] dark:bg-[#2D332F] text-white text-xs font-semibold hover:bg-[#C74169] transition-all"
              >
                {t.browseProductsNow}
              </button>
            </div>
          ) : (
            <>
              {/* Clear Cart link */}
              <div className="flex justify-end">
                <button
                  onClick={onClearCart}
                  className="text-[11px] text-[#9CA3AF] dark:text-[#78827A] hover:text-[#DC2626] transition-colors"
                >
                  {t.clearAllCart}
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {items.map((item) => {
                  const itemTotal = item.price !== null ? item.price * item.quantity : null;
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl border border-[#EFE9E2] dark:border-[#262C28] bg-[#FAF8F5] dark:bg-[#1A1E1B] flex items-center gap-3"
                    >
                      {/* Product Image */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-white dark:bg-[#222724] shrink-0 border border-[#EFE9E2] dark:border-[#2D332F]">
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-[#1F2421] dark:text-white truncate">
                          {item.productName}
                        </h4>
                        <p className="text-[11px] text-[#8C4A5E] dark:text-[#E06287] mt-0.5">
                          {t.sizeLabel}: {item.variantName}
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          {/* Unit price or total */}
                          <span className="text-xs font-bold text-[#1F2421] dark:text-white tabular-nums">
                            {itemTotal !== null
                              ? `${itemTotal.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US')} ${t.currencyShort}`
                              : t.contactForPrice}
                          </span>

                          {/* Stepper */}
                          <div className="flex items-center border border-[#E0D9CF] dark:border-[#2D332F] rounded-lg bg-white dark:bg-[#141715] p-0.5">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.id, -1)}
                              aria-label="Decrease"
                              className="p-1 hover:bg-[#F4EFEA] dark:hover:bg-[#282F2B] text-[#1F2421] dark:text-white rounded"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-xs font-bold tabular-nums text-[#1F2421] dark:text-white">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.id, 1)}
                              aria-label="Increase"
                              className="p-1 hover:bg-[#F4EFEA] dark:hover:bg-[#282F2B] text-[#1F2421] dark:text-white rounded"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Delete item button */}
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        aria-label="Remove item"
                        className="p-1.5 rounded-lg text-[#9CA3AF] dark:text-[#78827A] hover:text-[#DC2626] hover:bg-[#FEE2E2] dark:hover:bg-[#3D141A] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Order Terms Note */}
              <div className="p-3.5 rounded-xl bg-[#FFF9F5] dark:bg-[#241B15] border border-[#FDE3D3] dark:border-[#422B1E] text-xs space-y-1">
                <p className="font-bold text-[#8C3A00] dark:text-[#F39C56]">{t.paymentDeliveryInfo}</p>
                <p className="text-[#663C1B] dark:text-[#D1AB90] leading-relaxed text-[11px] whitespace-pre-line">
                  {t.cartNoticeLines}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer with Checkout Button */}
        {items.length > 0 && (
          <div className="p-5 border-t border-[#F0EBE6] dark:border-[#262C28] bg-[#FCFCFA] dark:bg-[#121513] space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-[#6B7280] dark:text-[#A8B0AA]">{t.productsSubtotal}</span>
              <span className="font-extrabold text-[#1F2421] dark:text-white text-base tabular-nums">
                {itemsTotal !== null
                  ? `${itemsTotal.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US')} ${t.currency}`
                  : t.pricesPendingConfirm}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#A8B0AA]">
              <span>{t.deliveryFee}</span>
              <span className="font-medium text-[#8C4A5E] dark:text-[#E06287]">
                {t.deliveryDeterminedViaWhatsApp}
              </span>
            </div>

            <button
              onClick={onProceedToCheckout}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#25D366] text-white hover:bg-[#20BA57] font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{t.proceedOrderWhatsApp}</span>
              {isRtl ? (
                <ArrowLeft className="w-4 h-4 me-auto" />
              ) : (
                <ArrowRight className="w-4 h-4 ms-auto" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
