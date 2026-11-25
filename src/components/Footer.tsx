import React from 'react';
import { MessageCircle, Facebook, Instagram, MapPin, Lock, Heart, ArrowUpRight, Sun, Moon, Globe } from 'lucide-react';
import { TulipLogo } from './TulipLogo.tsx';
import type { Category, StoreSettings } from '../types/store.ts';
import type { PolicyType } from './PolicyModal.tsx';
import { Language, Theme, translations } from '../utils/i18n.ts';

interface FooterProps {
  settings: StoreSettings;
  categories: Category[];
  language: Language;
  theme: Theme;
  activeTab?: string;
  onNavigate: (tab: string, categoryId?: string) => void;
  onOpenPolicy: (type: PolicyType) => void;
  onOpenAdmin: () => void;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  categories,
  language,
  theme,
  activeTab = 'home',
  onNavigate,
  onOpenPolicy,
  onOpenAdmin,
  onToggleTheme,
  onToggleLanguage,
}) => {
  const t = translations[language];

  return (
    <footer className="bg-[#FAF8F5] dark:bg-[#121513] border-t border-[#EFE9E2] dark:border-[#222724] text-[#4A4E4B] dark:text-[#A8B0AA] text-start pt-16 pb-12 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-[#EAE3DC] dark:border-[#262C28]">
          {/* Column 1 & 2: Brand Story & Official Contacts */}
          <div className="lg:col-span-2 space-y-5">
            <TulipLogo customLogoUrl={settings.logoUrl} size="lg" letterMark />
            <p className="text-xs sm:text-sm text-[#616662] dark:text-[#A8B0AA] leading-relaxed max-w-sm">
              {language === 'ar' ? (settings.storeDescription || t.defaultHeroSubtext) : t.defaultHeroSubtext}
            </p>

            <div className="space-y-2.5 pt-1 text-xs">
              <a
                href={settings.whatsappOfficialLink || `https://wa.me/967${settings.whatsappPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 text-[#1F2421] dark:text-white hover:text-[#25D366] dark:hover:text-[#42E67D] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#EBF8EE] dark:bg-[#1A3121] flex items-center justify-center text-[#25D366]">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-bold">{t.officialStoreWhatsApp}</span>
                  <span className="tabular-nums font-mono text-[#717772] dark:text-[#8D9690]" dir="ltr">
                    +967 {settings.whatsappPhone}
                  </span>
                </div>
              </a>

              <div className="flex items-center gap-2.5 text-[#616662] dark:text-[#8D9690]">
                <div className="w-8 h-8 rounded-full bg-[#F2EDE8] dark:bg-[#1D221F] flex items-center justify-center text-[#4A4E4B] dark:text-[#A8B0AA]">
                  <MapPin className="w-4 h-4" />
                </div>
                <span>{t.yemenDeliveryAllGov}</span>
              </div>
            </div>

            {/* Social Links & Theme/Language shortcuts in footer */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://www.facebook.com/share/1FrKX6pP1p/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 rounded-full bg-white dark:bg-[#1E2320] border border-[#D9D2C9] dark:border-[#2D332F] hover:border-[#1877F2] hover:text-[#1877F2] text-[#4A4E4B] dark:text-white flex items-center justify-center transition-colors shadow-sm"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://www.instagram.com/tolip.s14?utm_source=qr&bqrl=bTV2YmJoZ3dsZmZh"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-full bg-white dark:bg-[#1E2320] border border-[#D9D2C9] dark:border-[#2D332F] hover:border-[#E1306C] hover:text-[#E1306C] text-[#4A4E4B] dark:text-white flex items-center justify-center transition-colors shadow-sm"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href={settings.whatsappOfficialLink || `https://wa.me/967${settings.whatsappPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-9 h-9 rounded-full bg-[#25D366] text-white hover:bg-[#20BA57] flex items-center justify-center transition-colors shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
              </a>

              {activeTab === 'home' && (
                <>
                  <span className="h-5 w-px bg-[#D9D2C9] dark:bg-[#2D332F] mx-1" />

                  {/* Theme Toggle shortcut in footer */}
                  <button
                    onClick={onToggleTheme}
                    className="p-2 rounded-full bg-white dark:bg-[#1E2320] border border-[#D9D2C9] dark:border-[#2D332F] text-[#4A4E4B] dark:text-[#D1D8D3] hover:text-[#1F2421] dark:hover:text-white transition-colors"
                    title={theme === 'dark' ? t.themeLight : t.themeDark}
                  >
                    {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#555C57]" />}
                  </button>

                  {/* Language Toggle shortcut in footer */}
                  <button
                    onClick={onToggleLanguage}
                    className="px-2.5 py-1.5 rounded-full bg-white dark:bg-[#1E2320] border border-[#D9D2C9] dark:border-[#2D332F] text-xs font-semibold text-[#4A4E4B] dark:text-[#D1D8D3] hover:text-[#1F2421] dark:hover:text-white transition-colors flex items-center gap-1"
                    title="Toggle Language"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#C74169] dark:text-[#E06287]" />
                    <span className="font-sans text-[11px] uppercase">{language === 'ar' ? 'EN' : 'عربي'}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Column 3: Categories Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F2421] dark:text-white">
              {t.storeCategories}
            </h4>
            <ul className="space-y-2 text-xs">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => onNavigate('products', cat.id)}
                    className="text-[#616662] dark:text-[#A8B0AA] hover:text-[#C74169] dark:hover:text-[#E06287] transition-colors"
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Quick Navigation Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F2421] dark:text-white">
              {t.quickLinks}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('home')}
                  className="text-[#616662] dark:text-[#A8B0AA] hover:text-[#C74169] dark:hover:text-[#E06287] transition-colors"
                >
                  {t.home}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('products')}
                  className="text-[#616662] dark:text-[#A8B0AA] hover:text-[#C74169] dark:hover:text-[#E06287] transition-colors"
                >
                  {t.allProducts}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('categories')}
                  className="text-[#616662] dark:text-[#A8B0AA] hover:text-[#C74169] dark:hover:text-[#E06287] transition-colors"
                >
                  {t.categories}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('about')}
                  className="text-[#616662] dark:text-[#A8B0AA] hover:text-[#C74169] dark:hover:text-[#E06287] transition-colors"
                >
                  {t.about}
                </button>
              </li>
              <li>
                <a
                  href={settings.whatsappOfficialLink || `https://wa.me/967${settings.whatsappPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#616662] dark:text-[#A8B0AA] hover:text-[#25D366] dark:hover:text-[#42E67D] inline-flex items-center gap-1 transition-colors"
                >
                  <span>{t.storeWhatsApp}</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 5: Store Policies */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F2421] dark:text-white">
              {t.storePolicies}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onOpenPolicy('delivery')}
                  className="text-[#616662] dark:text-[#A8B0AA] hover:text-[#C74169] dark:hover:text-[#E06287] transition-colors"
                >
                  {t.deliveryPolicy}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('return')}
                  className="text-[#616662] dark:text-[#A8B0AA] hover:text-[#C74169] dark:hover:text-[#E06287] transition-colors"
                >
                  {t.returnPolicy}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('privacy')}
                  className="text-[#616662] dark:text-[#A8B0AA] hover:text-[#C74169] dark:hover:text-[#E06287] transition-colors"
                >
                  {t.privacyPolicy}
                </button>
              </li>
              <li className="pt-2">
                <button
                  onClick={onOpenAdmin}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#717772] dark:text-[#A8B0AA] hover:text-[#1F2421] dark:hover:text-white p-1 rounded transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{t.adminDashboard}</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Line */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8C938E] dark:text-[#78827A]">
          <p>
            {t.allRightsReserved.replace('{year}', String(new Date().getFullYear()))}
          </p>
          <p className="flex items-center gap-1">
            <span>{t.footerLoveNote}</span>
            <Heart className="w-3.5 h-3.5 text-[#C74169] dark:text-[#E06287] fill-[#C74169] dark:fill-[#E06287]" />
          </p>
        </div>
      </div>
    </footer>
  );
};
