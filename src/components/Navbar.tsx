import React, { useState } from 'react';
import {
  ShoppingBag,
  Heart,
  Search,
  MessageCircle,
  Menu,
  X,
  ArrowUpRight,
  Sun,
  Moon,
  Globe,
} from 'lucide-react';
import { TulipLogo } from './TulipLogo.tsx';
import type { StoreSettings } from '../types/store.ts';
import { Language, Theme, translations } from '../utils/i18n.ts';

interface NavbarProps {
  settings: StoreSettings;
  cartCount: number;
  favoritesCount: number;
  activeTab: string;
  language: Language;
  theme: Theme;
  onNavigate: (tab: string, categoryId?: string) => void;
  onOpenCart: () => void;
  onOpenFavorites: () => void;
  onOpenSearch: () => void;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  cartCount,
  favoritesCount,
  activeTab,
  language,
  theme,
  onNavigate,
  onOpenCart,
  onOpenFavorites,
  onOpenSearch,
  onToggleTheme,
  onToggleLanguage,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = translations[language];

  const navItems = [
    { id: 'home', label: t.home },
    { id: 'products', label: t.allProducts },
    { id: 'categories', label: t.categories },
    { id: 'about', label: t.about },
    { id: 'contact', label: t.contact },
  ];

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#FCFCFA]/90 dark:bg-[#121513]/90 border-b border-[#F0EBE6] dark:border-[#222724] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-3 sm:gap-4 lg:gap-8">
          {/* Zone 1: Brand Wordmark & Logo */}
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center focus:outline-none shrink-0 group text-start"
            aria-label={t.home}
          >
            <TulipLogo customLogoUrl={settings.logoUrl} size="md" />
          </button>

          {/* Zone 2: Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-7 text-sm font-medium text-[#4A4E4B] dark:text-[#A8B0AA]">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`relative py-2 whitespace-nowrap transition-colors duration-150 ${
                    isActive
                      ? 'text-[#C74169] dark:text-[#E06287] font-semibold'
                      : 'text-[#4A4E4B] dark:text-[#A8B0AA] hover:text-[#1F2421] dark:hover:text-white'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-[#C74169] dark:bg-[#E06287] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Interactive Controls (Language, Theme, Search, Favorites, Cart, WhatsApp) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Language & Theme Toggle Buttons (Only on Home Page) */}
            {activeTab === 'home' && (
              <>
                {/* Language Toggle Button */}
                <button
                  onClick={onToggleLanguage}
                  aria-label="Toggle language"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-[#4A4E4B] dark:text-[#D1D8D3] hover:text-[#1F2421] dark:hover:text-white hover:bg-[#F4EFEA] dark:hover:bg-[#1C221E] border border-[#EBE4DC] dark:border-[#2D332F] transition-all focus:outline-none"
                  title={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
                >
                  <Globe className="w-3.5 h-3.5 text-[#C74169] dark:text-[#E06287]" />
                  <span className="font-sans text-[11px] uppercase tracking-wider">
                    {language === 'ar' ? 'English' : 'عربي'}
                  </span>
                </button>

                {/* Dark / Light Theme Toggle Button */}
                <button
                  onClick={onToggleTheme}
                  aria-label={theme === 'dark' ? t.themeLight : t.themeDark}
                  className="p-2 sm:p-2.5 rounded-full text-[#4A4E4B] dark:text-[#D1D8D3] hover:text-[#1F2421] dark:hover:text-white hover:bg-[#F4EFEA] dark:hover:bg-[#1C221E] transition-colors focus:outline-none border border-transparent dark:border-[#2D332F]"
                  title={theme === 'dark' ? t.themeLight : t.themeDark}
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-in spin-in-90 duration-200" />
                  ) : (
                    <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-[#555C57] animate-in spin-in-90 duration-200" />
                  )}
                </button>
              </>
            )}

            {/* Search Trigger */}
            <button
              onClick={onOpenSearch}
              aria-label={t.searchButton}
              className="p-2 sm:p-2.5 rounded-full text-[#4A4E4B] dark:text-[#D1D8D3] hover:text-[#1F2421] dark:hover:text-white hover:bg-[#F4EFEA] dark:hover:bg-[#1C221E] transition-colors focus:outline-none"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Favorites Button */}
            <button
              onClick={onOpenFavorites}
              aria-label={t.favorites}
              className="relative p-2 sm:p-2.5 rounded-full text-[#4A4E4B] dark:text-[#D1D8D3] hover:text-[#C74169] dark:hover:text-[#E06287] hover:bg-[#FFF0F4] dark:hover:bg-[#2A161E] transition-colors focus:outline-none"
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
              {favoritesCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#C74169] dark:bg-[#E06287] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Cart Trigger */}
            <button
              onClick={onOpenCart}
              aria-label={t.cart}
              className="relative p-2 sm:p-2.5 rounded-full text-[#1F2421] dark:text-white bg-[#F7F4F0] dark:bg-[#1D221F] hover:bg-[#ECE6DE] dark:hover:bg-[#282F2B] transition-colors focus:outline-none flex items-center gap-1.5 sm:gap-2"
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              {cartCount > 0 ? (
                <span className="bg-[#C74169] dark:bg-[#E06287] text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {cartCount}
                </span>
              ) : (
                <span className="hidden sm:inline text-xs font-medium text-[#6B7280] dark:text-[#9DA6A0]">{t.cart}</span>
              )}
            </button>

            {/* Direct WhatsApp Quick Connect (Desktop) */}
            <a
              href={settings.whatsappOfficialLink || `https://wa.me/967${settings.whatsappPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden xl:inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold bg-[#25D366]/10 text-[#1B8340] dark:text-[#42E67D] hover:bg-[#25D366]/20 transition-all border border-[#25D366]/30"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <span>{t.storeWhatsApp}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Open menu"
              className="md:hidden p-2 rounded-lg text-[#1F2421] dark:text-white hover:bg-[#F4EFEA] dark:hover:bg-[#1C221E] focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#F0EBE6] dark:border-[#222724] bg-[#FCFCFA] dark:bg-[#141715] px-4 pt-4 pb-6 space-y-2 shadow-xl animate-in slide-in-from-top-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full text-start px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-[#FFF0F4] dark:bg-[#2B1720] text-[#C74169] dark:text-[#E06287] font-bold'
                  : 'text-[#374151] dark:text-[#D1D8D3] hover:bg-[#F7F4F0] dark:hover:bg-[#1C221E]'
              }`}
            >
              {item.label}
            </button>
          ))}

          <div className="pt-3 border-t border-[#F0EBE6] dark:border-[#222724] space-y-2">
            {activeTab === 'home' && (
              <div className="flex items-center justify-between px-2 py-1 text-xs text-[#6B7280] dark:text-[#9DA6A0]">
                <span>{language === 'ar' ? 'اللغة والوضع' : 'Language & Theme'}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onToggleLanguage}
                    className="px-2.5 py-1 rounded-lg bg-[#FAF7F3] dark:bg-[#1E2320] text-[#1F2421] dark:text-white font-medium border border-[#E0D9CF] dark:border-[#2D332F]"
                  >
                    {language === 'ar' ? 'English' : 'عربي'}
                  </button>
                  <button
                    onClick={onToggleTheme}
                    className="p-1.5 rounded-lg bg-[#FAF7F3] dark:bg-[#1E2320] text-[#1F2421] dark:text-white border border-[#E0D9CF] dark:border-[#2D332F]"
                  >
                    {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#555C57]" />}
                  </button>
                </div>
              </div>
            )}

            <a
              href={settings.whatsappOfficialLink || `https://wa.me/967${settings.whatsappPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-[#25D366] text-white hover:bg-[#20BA57] shadow-sm transition-all"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{t.storeWhatsApp} ({settings.whatsappPhone})</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
