import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Heart,
  Search,
  MessageCircle,
  Menu,
  X,
  ArrowUpRight,
  Sun,
  Moon,
} from 'lucide-react';
import { TulipLogo } from './TulipLogo.tsx';
import type { StoreSettings } from '../types/store.ts';
import { Language, Theme, translations } from '../utils/i18n.ts';

interface NavbarProps {
  settings: StoreSettings;
  favoritesCount: number;
  activeTab: string;
  language: Language;
  theme: Theme;
  onNavigate: (tab: string, categoryId?: string) => void;
  onOpenFavorites: () => void;
  onOpenSearch: () => void;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  favoritesCount,
  activeTab,
  language,
  theme,
  onNavigate,
  onOpenFavorites,
  onOpenSearch,
  onToggleTheme,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = translations[language];

  const navItems = [
    { id: 'home', label: t.home },
    { id: 'products', label: t.allProducts },
    { id: 'offers', label: language === 'ar' ? 'العروض' : 'Offers' },
    { id: 'categories', label: t.categories },
    { id: 'about', label: t.about },
    { id: 'contact', label: t.contact },
  ];

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  const themeLabel = theme === 'dark' ? t.themeLight : t.themeDark;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#F0EBE6] bg-[#FCFCFA]/95 backdrop-blur-xl transition-colors duration-200 dark:border-[#222724] dark:bg-[#121513]/95">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2 sm:h-20 sm:gap-4 lg:gap-8">
          {/* Brand: compact mark on phones, full wordmark on larger screens */}
          <button
            onClick={() => handleNavClick('home')}
            className="min-w-0 shrink flex items-center rounded-xl text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C74169]"
            aria-label={t.home}
          >
            <span className="md:hidden">
              <TulipLogo customLogoUrl={settings.logoUrl} size="sm" letterMark />
            </span>
            <span className="hidden md:inline-flex">
              <TulipLogo customLogoUrl={settings.logoUrl} size="md" letterMark />
            </span>
          </button>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-6 text-sm font-medium text-[#4A4E4B] dark:text-[#A8B0AA] md:flex lg:gap-7">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative whitespace-nowrap rounded-lg py-2 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C74169] ${
                    isActive
                      ? 'font-semibold text-[#C74169] dark:text-[#E06287]'
                      : 'text-[#4A4E4B] hover:text-[#1F2421] dark:text-[#A8B0AA] dark:hover:text-white'
                  }`}
                >
                  {item.label}
                  {isActive && <motion.span layoutId="tolip-nav-active" className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#C74169] dark:bg-[#E06287]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                </button>
              );
            })}
          </nav>

          {/* Desktop controls */}
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <button
              onClick={onToggleTheme}
              aria-label={themeLabel}
              aria-pressed={theme === 'dark'}
              title={themeLabel}
              className={`h-11 w-11 rounded-full border shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C74169] ${
                theme === 'dark'
                  ? 'border-[#465047] bg-[#2A302B] text-amber-300 hover:bg-[#39423B]'
                  : 'border-[#F2D28B] bg-[#FFF4D6] text-[#A16207] hover:bg-[#FFE7A3]'
              }`}
            >
              {theme === 'dark' ? <Sun className="mx-auto h-5 w-5" /> : <Moon className="mx-auto h-5 w-5" />}
            </button>

            <button
              onClick={onOpenSearch}
              aria-label={t.searchButton}
              className="flex h-11 w-11 items-center justify-center rounded-full text-[#4A4E4B] transition-colors hover:bg-[#F4EFEA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C74169] dark:text-[#D1D8D3] dark:hover:bg-[#1C221E]"
            >
              <Search className="h-5 w-5" />
            </button>

            <button
              onClick={onOpenFavorites}
              aria-label={t.favorites}
              className="relative flex h-11 w-11 items-center justify-center rounded-full text-[#4A4E4B] transition-colors hover:bg-[#FFF0F4] hover:text-[#C74169] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C74169] dark:text-[#D1D8D3] dark:hover:bg-[#2A161E] dark:hover:text-[#E06287]"
            >
              <Heart className="h-5 w-5" />
              {favoritesCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C74169] px-1 text-[10px] font-bold text-white dark:bg-[#E06287]">
                  {favoritesCount}
                </span>
              )}
            </button>

            <a
              href={settings.whatsappOfficialLink || `https://wa.me/967${settings.whatsappPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 rounded-full border border-[#25D366]/30 bg-[#25D366]/10 px-3.5 py-2 text-xs font-semibold text-[#1B8340] transition-all hover:bg-[#25D366]/20 xl:inline-flex dark:text-[#42E67D]"
            >
              <MessageCircle className="h-4 w-4 text-[#25D366]" />
              <span>{t.storeWhatsApp}</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Phone controls: theme is always visible, whatever page is open */}
          <div className="flex shrink-0 items-center gap-1 md:hidden">
            <button
              onClick={onToggleTheme}
              aria-label={themeLabel}
              aria-pressed={theme === 'dark'}
              title={themeLabel}
              className={`theme-toggle-touch flex h-11 w-11 shrink-0 items-center justify-center rounded-full border shadow-sm transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C74169] ${
                theme === 'dark'
                  ? 'border-[#465047] bg-[#2A302B] text-amber-300'
                  : 'border-[#F2D28B] bg-[#FFF4D6] text-[#A16207]'
              }`}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <button
              onClick={onOpenSearch}
              aria-label={t.searchButton}
              className="flex h-11 w-10 shrink-0 items-center justify-center rounded-full text-[#4A4E4B] transition-colors active:bg-[#F4EFEA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C74169] dark:text-[#D1D8D3] dark:active:bg-[#1C221E]"
            >
              <Search className="h-5 w-5" />
            </button>

            <button
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-expanded={mobileMenuOpen}
              aria-controls="tolip-mobile-navigation"
              aria-label={mobileMenuOpen ? (language === 'ar' ? 'إغلاق القائمة' : 'Close menu') : (language === 'ar' ? 'فتح القائمة' : 'Open menu')}
              className="flex h-11 w-10 shrink-0 items-center justify-center rounded-full text-[#1F2421] transition-colors active:bg-[#F4EFEA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C74169] dark:text-white dark:active:bg-[#1C221E]"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence initial={false}>
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          id="tolip-mobile-navigation"
          className="animate-in slide-in-from-top-2 space-y-2 border-t border-[#F0EBE6] bg-[#FCFCFA] px-3 pb-5 pt-3 text-[#1F2421] shadow-xl dark:border-[#222724] dark:bg-[#141715] dark:text-[#F1F4F2] sm:px-5 md:hidden"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              aria-current={activeTab === item.id ? 'page' : undefined}
              className={`w-full rounded-xl px-4 py-3 text-start text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C74169] ${
                activeTab === item.id
                  ? 'bg-[#FFF0F4] font-bold text-[#C74169] dark:bg-[#2B1720] dark:text-[#E06287]'
                  : 'text-[#374151] hover:bg-[#F7F4F0] dark:text-[#D1D8D3] dark:hover:bg-[#1C221E]'
              }`}
            >
              {item.label}
            </button>
          ))}

          <div className="flex flex-wrap items-center gap-2 border-t border-[#F0EBE6] pt-3 dark:border-[#222724]">
            <button
              onClick={() => { onOpenFavorites(); setMobileMenuOpen(false); }}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#E9E1D9] bg-white px-3 text-sm font-semibold text-[#4A4E4B] dark:border-[#303832] dark:bg-[#1B211D] dark:text-[#E2E7E3]"
            >
              <Heart className="h-4 w-4 text-[#C74169]" />
              {t.favorites}{favoritesCount > 0 ? ` (${favoritesCount})` : ''}
            </button>
          </div>

          <a
            href={settings.whatsappOfficialLink || `https://wa.me/967${settings.whatsappPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#20BA57]"
          >
            <MessageCircle className="h-5 w-5" />
            <span>{t.storeWhatsApp} ({settings.whatsappPhone})</span>
          </a>
        </motion.div>
      )}
      </AnimatePresence>
    </header>
  );
};
