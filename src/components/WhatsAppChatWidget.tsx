import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, CheckCheck, ChevronDown } from 'lucide-react';
import type { StoreSettings } from '../types/store.ts';
import { Language } from '../utils/i18n.ts';

interface WhatsAppChatWidgetProps {
  settings: StoreSettings;
  language: Language;
}

export const WhatsAppChatWidget: React.FC<WhatsAppChatWidgetProps> = ({
  settings,
  language,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  const phone = settings.whatsappPhone || '771968642';
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.startsWith('967') ? cleanPhone : `967${cleanPhone}`;

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const quickQuestionsAr = [
    'مرحباً، أرغب في الاستفسار عن منتجات العناية بالبشرة',
    'أرغب في معرفة أسعار ورسوم التوصيل إلى محافظتي',
    'أريد المساعدة في اختيار المنتج الأنسب لنوع بشرتي',
    'أود الاستفسار عن توفر منتج محدد لديكم',
  ];

  const quickQuestionsEn = [
    'Hello, I would like to inquire about skincare products',
    'What are the delivery fees and timeframe for my city?',
    'I need guidance choosing the right product for my skin type',
    'I would like to check availability for a specific product',
  ];

  const quickQuestions = language === 'ar' ? quickQuestionsAr : quickQuestionsEn;

  const handleSend = (textToSend?: string) => {
    const finalMsg = (textToSend || message).trim();
    const defaultGreeting =
      language === 'ar'
        ? 'مرحباً متجر توليب، أود التواصل معكم بخصوص المنتجات'
        : 'Hello Tulip Natural Care, I would like to inquire about your products';

    const textToEncode = finalMsg || defaultGreeting;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(textToEncode)}`;
    window.open(url, '_blank');
    setMessage('');
    setIsOpen(false);
  };

  return (
    <div
      ref={widgetRef}
      className="fixed bottom-5 end-5 z-40 flex flex-col items-end pointer-events-auto"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Floating Chat Window */}
      {isOpen && (
        <div className="mb-3 w-[calc(100vw-2.5rem)] sm:w-96 rounded-3xl bg-white dark:bg-[#1A1F1C] border border-[#EBE4DC] dark:border-[#2D3830] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1B8340] to-[#25D366] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-inner">
                  <MessageCircle className="w-6 h-6 fill-white" />
                </div>
                {/* Active pulse status */}
                <span className="absolute -top-0.5 -end-0.5 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 border-2 border-[#1B8340]" />
                </span>
              </div>

              <div>
                <h4 className="font-bold text-sm leading-tight">
                  {language === 'ar' ? 'توليب – شات واتساب المباشر' : 'Tulip – Live WhatsApp'}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-white/90">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 inline-block animate-pulse" />
                  <span>{language === 'ar' ? 'متصلون الآن للرد فوراً' : 'Online now to assist you'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors focus:outline-none"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body / Conversation Starter */}
          <div className="p-4 space-y-3.5 bg-[#FAF7F3] dark:bg-[#121513] max-h-[60vh] overflow-y-auto">
            {/* Store Greeting Bubble */}
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#C74169] text-white flex items-center justify-center shrink-0 text-xs font-black">
                T
              </div>
              <div className="bg-white dark:bg-[#1A1F1C] border border-[#EDE5DC] dark:border-[#2D3830] rounded-2xl rounded-tr-none p-3 shadow-sm text-xs text-[#2E3330] dark:text-[#E2DFD9] leading-relaxed">
                <p className="font-semibold text-[#1F2421] dark:text-white mb-1">
                  {language === 'ar'
                    ? 'أهلاً بكِ في توليب للعناية الطبيعية!'
                    : 'Welcome to Tulip Natural Care!'}
                </p>
                <p className="text-[11.5px] text-[#555C57] dark:text-[#BAC0BB]">
                  {language === 'ar'
                    ? 'فريق خدمة العملاء جاهز للإجابة على جميع استفساراتك حول المنتجات وتأكيد طلباتك مباشرة عبر واتساب.'
                    : 'Our team is ready to answer your inquiries and confirm your order directly on WhatsApp.'}
                </p>
                <span className="text-[10px] text-[#9BA19D] block mt-1.5 text-end flex items-center justify-end gap-1">
                  <CheckCheck className="w-3.5 h-3.5 text-[#25D366]" />
                  <span>{language === 'ar' ? 'الآن' : 'Just now'}</span>
                </span>
              </div>
            </div>

            {/* Quick Questions Suggestions */}
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-bold text-[#6E7470] dark:text-[#9BA19D] px-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#C74169]" />
                <span>{language === 'ar' ? 'استفسارات شائعة وسريعة:' : 'Quick Questions:'}</span>
              </p>
              <div className="flex flex-col gap-1.5">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="text-start text-xs p-2.5 rounded-xl bg-white dark:bg-[#1A1F1C] border border-[#E5DDD4] dark:border-[#2D3830] hover:border-[#25D366] dark:hover:border-[#25D366] text-[#333835] dark:text-[#E2DFD9] hover:bg-[#F2FAF4] dark:hover:bg-[#15241A] transition-colors shadow-2xs group flex items-center justify-between"
                  >
                    <span className="line-clamp-2 leading-snug">{q}</span>
                    <Send className="w-3 h-3 text-[#25D366] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ms-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Input */}
          <div className="p-3 bg-white dark:bg-[#1A1F1C] border-t border-[#EBE4DC] dark:border-[#2D3830] space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  language === 'ar'
                    ? 'اكتبي استفسارك هنا...'
                    : 'Type your message here...'
                }
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#D9D2C9] dark:border-[#2D3830] bg-[#FAF7F3] dark:bg-[#121513] text-xs text-[#1F2421] dark:text-white placeholder-[#8D9690] focus:outline-none focus:border-[#25D366]"
              />
              <button
                type="button"
                onClick={() => handleSend()}
                className="p-2.5 rounded-xl bg-[#25D366] text-white hover:bg-[#20BA57] transition-colors shrink-0 shadow-sm"
                title={language === 'ar' ? 'إرسال عبر واتساب' : 'Send via WhatsApp'}
              >
                <Send className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>

            {/* Direct Official Link Fallback */}
            <a
              href={settings.whatsappOfficialLink || `https://wa.me/${formattedPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold text-[#1B8340] dark:text-[#42E67D] hover:underline"
            >
              <span>{language === 'ar' ? 'فتح المحادثة المباشرة في تطبيق واتساب' : 'Open WhatsApp application directly'}</span>
            </a>
          </div>
        </div>
      )}

      {/* Floating Main Button */}
      <div className="relative flex items-center gap-2.5">
        {/* Subtle tooltip pill if not open */}
        {!isOpen && !hasInteracted && (
          <div
            onClick={() => {
              setIsOpen(true);
              setHasInteracted(true);
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full bg-white dark:bg-[#1A1F1C] text-[#1F2421] dark:text-white border border-[#E5DDD4] dark:border-[#2D3830] shadow-lg text-xs font-bold cursor-pointer hover:border-[#25D366] transition-all animate-bounce duration-1000 select-none"
          >
            <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
            <span>{language === 'ar' ? 'تحدثي معنا عبر واتساب' : 'Chat with us on WhatsApp'}</span>
          </div>
        )}

        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setHasInteracted(true);
          }}
          aria-label="WhatsApp Chat"
          className="relative w-14 h-14 rounded-full bg-[#25D366] text-white hover:bg-[#20BA57] flex items-center justify-center shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all focus:outline-none group"
        >
          {isOpen ? (
            <ChevronDown className="w-7 h-7 transition-transform group-hover:translate-y-0.5" />
          ) : (
            <>
              <MessageCircle className="w-7 h-7 fill-white" />
              {/* Green online ring badge */}
              <span className="absolute -top-1 -end-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white dark:border-[#121513]" />
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
