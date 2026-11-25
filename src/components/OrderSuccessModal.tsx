import React from 'react';
import { CheckCircle2, MessageCircle, Copy, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import type { Order, StoreSettings } from '../types/store.ts';
import { Language, translations } from '../utils/i18n.ts';

interface OrderSuccessModalProps {
  order: Order | null;
  whatsappUrl: string;
  settings: StoreSettings;
  language: Language;
  onClose: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  whatsappUrl,
  settings,
  language,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!order) return null;

  const t = translations[language];
  const isRtl = language === 'ar';

  const handleCopyOrderNumber = () => {
    navigator.clipboard.writeText(order.orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#161917] rounded-3xl shadow-2xl border border-[#EFE9E2] dark:border-[#262C28] overflow-hidden p-6 sm:p-8 text-center space-y-6 text-start"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-full bg-[#EBF5ED] dark:bg-[#1B3624] text-[#25D366] mx-auto flex items-center justify-center shadow-sm">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        {/* Heading */}
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-black text-[#1F2421] dark:text-white">
            {t.orderSuccessTitle}
          </h2>
          <p className="text-xs sm:text-sm text-[#555C57] dark:text-[#A8B0AA] leading-relaxed">
            {t.orderSuccessSubtitle}
          </p>

          {/* Unique Order Number Pill */}
          <div className="inline-flex items-center gap-2 bg-[#F7F4F0] dark:bg-[#1E2320] px-4 py-2 rounded-xl border border-[#E5DFD7] dark:border-[#2D332F] text-sm font-black text-[#1F2421] dark:text-white tabular-nums mt-1">
            <span>{order.orderNumber}</span>
            <button
              onClick={handleCopyOrderNumber}
              title={t.copyOrderNumber}
              className="p-1 hover:bg-white dark:hover:bg-[#282F2B] rounded text-[#6B7280] dark:text-[#A8B0AA] hover:text-[#1F2421] dark:hover:text-white transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* WhatsApp Call to Action */}
        <div className="p-4 rounded-2xl bg-[#EAF8EE] dark:bg-[#152B1B] border border-[#C6ECD1] dark:border-[#204E2D] space-y-3 text-start">
          <div className="flex items-start gap-3">
            <MessageCircle className="w-5 h-5 text-[#25D366] shrink-0 mt-0.5" />
            <div className="text-xs text-[#1E5C31] dark:text-[#5BE886] leading-relaxed space-y-1">
              <p className="font-bold">{t.nextStepTitle}</p>
              <p>{t.nextStepDesc}</p>
            </div>
          </div>

          <button
            onClick={handleOpenWhatsApp}
            className="w-full py-3.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20BA57] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{t.openWhatsAppNow}</span>
          </button>
        </div>

        {/* Summary Details */}
        <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1A1E1B] border border-[#EFE9E2] dark:border-[#262C28] text-xs space-y-2 text-start">
          <div className="flex justify-between text-[#6B7280] dark:text-[#A8B0AA]">
            <span>{t.customerName}</span>
            <span className="font-semibold text-[#1F2421] dark:text-white">{order.customerDetails.fullName}</span>
          </div>
          <div className="flex justify-between text-[#6B7280] dark:text-[#A8B0AA]">
            <span>{t.customerPhone}</span>
            <span className="font-semibold text-[#1F2421] dark:text-white tabular-nums" dir="ltr">
              {order.customerDetails.phone}
            </span>
          </div>
          <div className="flex justify-between text-[#6B7280] dark:text-[#A8B0AA]">
            <span>{t.customerCity}</span>
            <span className="font-semibold text-[#1F2421] dark:text-white">{order.customerDetails.city}</span>
          </div>
          <div className="flex justify-between text-[#6B7280] dark:text-[#A8B0AA]">
            <span>{t.itemsQuantity}</span>
            <span className="font-semibold text-[#1F2421] dark:text-white">{order.items.length} {t.itemsCount}</span>
          </div>
          <div className="flex justify-between text-[#6B7280] dark:text-[#A8B0AA] pt-1 border-t border-[#EAE3DC] dark:border-[#2D332F]">
            <span>{t.paymentMethod}</span>
            <span className="font-bold text-[#2D5237] dark:text-[#42E67D]">{t.codMethod}</span>
          </div>
        </div>

        {/* Back to store button */}
        <button
          onClick={onClose}
          className="w-full py-3 px-4 rounded-2xl border border-[#D9D2C9] dark:border-[#2D332F] text-xs font-bold text-[#1F2421] dark:text-white hover:bg-[#FAF8F5] dark:hover:bg-[#1E2320] transition-all flex items-center justify-center gap-2"
        >
          <span>{t.backToStore}</span>
          {isRtl ? <ArrowRight className="w-4 h-4 rotate-180" /> : <ArrowLeft className="w-4 h-4 rotate-180" />}
        </button>
      </div>
    </div>
  );
};
