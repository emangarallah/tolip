import React from 'react';
import { X, ShieldCheck, Truck, RotateCcw, Heart } from 'lucide-react';
import type { StoreSettings } from '../types/store.ts';
import { Language, translations } from '../utils/i18n.ts';

export type PolicyType = 'delivery' | 'return' | 'privacy' | 'about';

interface PolicyModalProps {
  type: PolicyType | null;
  settings: StoreSettings;
  language: Language;
  onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({
  type,
  settings,
  language,
  onClose,
}) => {
  if (!type) return null;

  const t = translations[language];

  const getPolicyDetails = () => {
    switch (type) {
      case 'delivery':
        return {
          title: t.deliveryPolicy,
          icon: <Truck className="w-6 h-6 text-[#3B6948] dark:text-[#529E67]" />,
          content: settings.deliveryPolicy,
          extra: (
            <div className="mt-4 p-4 rounded-2xl bg-[#F6F4EE] dark:bg-[#191E1B] border border-[#E8E2D8] dark:border-[#2D332F] space-y-2 text-xs">
              <p className="font-bold text-[#1F2421] dark:text-white">
                {language === 'ar' ? 'تغطية التوصيل في المحافظات اليمنية:' : 'Delivery coverage across Yemeni governorates:'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[#555C57] dark:text-[#A8B0AA]">
                {settings.cities.map((c) => (
                  <div key={c.city} className="p-2 rounded-lg bg-white dark:bg-[#131614] border border-[#E0D9CF] dark:border-[#282E2B]">
                    <span className="font-bold block text-[#1F2421] dark:text-white">{c.city}</span>
                    <span className="text-[11px] text-[#717772] dark:text-[#8D9690]">
                      {c.fee !== null ? `${c.fee.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US')} ${t.currencyShort}` : t.determinedLater} · {c.estimatedDays}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ),
        };
      case 'return':
        return {
          title: t.returnPolicy,
          icon: <RotateCcw className="w-6 h-6 text-[#C74169] dark:text-[#E06287]" />,
          content: settings.returnPolicy,
          extra: (
            <div className="mt-4 p-4 rounded-2xl bg-[#FFF9F5] dark:bg-[#241B15] border border-[#FDE3D3] dark:border-[#422B1E] text-xs text-[#8C3A00] dark:text-[#F39C56] space-y-1">
              <p className="font-bold">{language === 'ar' ? 'ملاحظة هامة للمنتجات الطبيعية:' : 'Important notice for natural products:'}</p>
              <p className="text-[11px] leading-relaxed text-[#663C1B] dark:text-[#D1AB90]">
                {language === 'ar'
                  ? 'حرصاً على سلامتكِ ونظافة مستحضرات العناية الشخصية، يُشترط أن تكون العبوات غير مفتوحة وبحالتها الأصلية مع إشعارنا خلال 48 ساعة من الاستلام عبر واتساب.'
                  : 'For hygiene and safety, products must be unopened in original packaging with notification via WhatsApp within 48 hours of receipt.'}
              </p>
            </div>
          ),
        };
      case 'privacy':
        return {
          title: t.privacyPolicy,
          icon: <ShieldCheck className="w-6 h-6 text-[#2563EB] dark:text-[#60A5FA]" />,
          content: settings.privacyPolicy,
          extra: null,
        };
      case 'about':
        return {
          title: language === 'ar' ? 'عن متجر توليب – Tolipe Natural Care' : 'About Tolipe Natural Care',
          icon: <Heart className="w-6 h-6 text-[#C74169] dark:text-[#E06287]" />,
          content: settings.aboutUsText,
          extra: (
            <div className="mt-4 p-4 rounded-2xl bg-[#FFF0F4] dark:bg-[#2A161E] border border-[#F5E1E8] dark:border-[#3D202B] text-xs text-[#8C4A5E] dark:text-[#E06287] space-y-1">
              <p className="font-bold">{language === 'ar' ? 'رؤيتنا ورسالتنا:' : 'Our Vision & Mission:'}</p>
              <p className="text-[11px] leading-relaxed">
                {language === 'ar'
                  ? 'أن نكون الخيار الأول في اليمن لكل امرأة تبحث عن الجمال الطبيعي الحقيقي المستمد من خيرات الأرض والزيوت والأعشاب النقية، دون الإضرار بالصحة أو استخدام المواد الكيميائية القاسية.'
                  : 'To be the premier choice in Yemen for authentic natural beauty derived from pure botanical oils and herbs, free from harsh synthetic chemicals.'}
              </p>
            </div>
          ),
        };
    }
  };

  const details = getPolicyDetails();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-white dark:bg-[#161917] rounded-3xl shadow-2xl border border-[#EFE9E2] dark:border-[#262C28] overflow-hidden my-auto text-start p-6 sm:p-8 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE6] dark:border-[#262C28]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#FAF7F3] dark:bg-[#1E2320] border border-[#EAE3DC] dark:border-[#2D332F]">
              {details.icon}
            </div>
            <h2 className="text-xl font-bold text-[#1F2421] dark:text-white">{details.title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-full hover:bg-[#F4EFEA] dark:hover:bg-[#1E2320] text-[#6B7280] dark:text-[#A8B0AA] hover:text-[#1F2421] dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-sm text-[#4A4E4B] dark:text-[#D1D8D3] leading-relaxed whitespace-pre-line max-h-[60vh] overflow-y-auto pe-1">
          {details.content}
        </div>

        {details.extra}

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-[#1F2421] dark:bg-[#2D332F] text-white text-xs font-semibold hover:bg-[#C74169] transition-all"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
