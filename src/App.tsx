import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Heart,
  MessageCircle,
  Search,
  Filter,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Truck,
  Leaf,
  Flower2,
  Facebook,
  Instagram,
  ArrowUpRight,
} from 'lucide-react';
import { Navbar } from './components/Navbar.tsx';
import { Hero } from './components/Hero.tsx';
import { CategoriesSection } from './components/CategoriesSection.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { ProductDetailModal } from './components/ProductDetailModal.tsx';
import { CheckoutModal } from './components/CheckoutModal.tsx';
import { OrderSuccessModal } from './components/OrderSuccessModal.tsx';
import { PolicyModal, PolicyType } from './components/PolicyModal.tsx';
import { Footer } from './components/Footer.tsx';
import { SearchModal } from './components/SearchModal.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { WhatsAppChatWidget } from './components/WhatsAppChatWidget.tsx';
import { TulipOpeningMark } from './components/TulipOpeningMark.tsx';
import type { Product, Category, StoreSettings, Order } from './types/store.ts';
import { Language, Theme, translations } from './utils/i18n.ts';

export default function App() {
  // Keep Tolip's blush-and-ivory brand palette light so the transparent PNG logo never sits on a black surface.
  const [theme, setTheme] = useState<Theme>('light');

  // Language State ('ar' | 'en')
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const savedLang = localStorage.getItem('tulip_lang');
      return savedLang === 'en' ? 'en' : 'ar';
    } catch {
      return 'ar';
    }
  });

  // Main Data States
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [splashMinimumElapsed, setSplashMinimumElapsed] = useState(false);

  // Navigation & View States
  const [activeTab, setActiveTab] = useState<'home' | 'products' | 'categories' | 'about' | 'contact'>('home');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [productSortBy, setProductSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'name'>('newest');
  const [filterInStockOnly, setFilterInStockOnly] = useState(false);
  const [filterBestSellersOnly, setFilterBestSellersOnly] = useState(false);
  const [filterSearchQuery, setFilterSearchQuery] = useState('');

  // Favorites State (Persisted in localStorage)
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tulip_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modals & Drawers
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [checkoutVariantId, setCheckoutVariantId] = useState('');
  const [checkoutQuantity, setCheckoutQuantity] = useState(1);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [policyType, setPolicyType] = useState<PolicyType | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [completedOrder, setCompletedOrder] = useState<{ order: Order; whatsappUrl: string } | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Keep the document class, browser controls and stored preference in sync.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem('tulip_theme', theme);
    } catch (e) {
      console.error('Unable to persist theme preference:', e);
    }
  }, [theme]);

  // Show the branded opening screen for at least 1.8 seconds on every fresh visit.
  // If the API takes longer, the opening screen remains visible until the store is ready.
  useEffect(() => {
    const timer = window.setTimeout(() => setSplashMinimumElapsed(true), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  // Language & Direction Sync effect
  useEffect(() => {
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
    try {
      localStorage.setItem('tulip_lang', language);
    } catch (e) {
      console.error(e);
    }
  }, [language]);

  // Sync Favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tulip_favorites', JSON.stringify(favorites));
    } catch (err) {
      console.error(err);
    }
  }, [favorites]);

  // Fetch initial store data from backend API
  const fetchStoreData = async () => {
    try {
      const [settingsRes, catsRes, prodsRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/categories'),
        fetch('/api/products'),
      ]);

      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (catsRes.ok) setCategories(await catsRes.json());
      if (prodsRes.ok) setProducts(await prodsRes.json());
    } catch (err) {
      console.error('Error fetching initial store data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
  }, []);

  // Toggle between light and dark; light remains the default for new visitors.
  // The theme-sync effect above persists the customer's selected preference.
  const handleToggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'));
  };

  const handleToggleLanguage = () => {
    setLanguage((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  const t = translations[language];
  const isRtl = language === 'ar';

  // Open the delivery form directly for a single selected product.
  const handleStartOrder = (product: Product, variantId?: string, quantity = 1) => {
    const selectedVariant =
      product.variants.find((variant) => variant.id === variantId && variant.stock > 0) ||
      product.variants.find((variant) => variant.stock > 0);

    if (!selectedVariant || !product.inStock) return;

    setCheckoutProduct(product);
    setCheckoutVariantId(selectedVariant.id);
    setCheckoutQuantity(Math.max(1, Math.floor(quantity)));
    setSelectedProduct(null);
    setIsCheckoutOpen(true);
  };

  // Favorites Action
  const handleToggleFavorite = (product: Product) => {
    setFavorites((prev) =>
      prev.includes(product.id) ? prev.filter((id) => id !== product.id) : [...prev, product.id]
    );
  };

  // Navigation router handler
  const handleNavigate = (tab: string, categoryId?: string) => {
    if (tab === 'home') {
      setActiveTab('home');
      setSelectedCategoryId('all');
      setShowFavoritesOnly(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'products') {
      setActiveTab('products');
      if (categoryId) setSelectedCategoryId(categoryId);
      setShowFavoritesOnly(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'categories') {
      setActiveTab('categories');
      setShowFavoritesOnly(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'about') {
      setActiveTab('about');
      setShowFavoritesOnly(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'contact') {
      setActiveTab('contact');
      setShowFavoritesOnly(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    if (showFavoritesOnly && !favorites.includes(p.id)) return false;
    if (selectedCategoryId !== 'all' && p.categoryId !== selectedCategoryId) return false;
    if (filterInStockOnly && !p.inStock) return false;
    if (filterBestSellersOnly && !p.isBestSeller) return false;
    if (filterSearchQuery.trim()) {
      const q = filterSearchQuery.trim().toLowerCase();
      const match =
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.features.some((f) => f.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (productSortBy === 'price-asc') {
      const minA = Math.min(...a.variants.map((v) => v.price ?? Infinity));
      const minB = Math.min(...b.variants.map((v) => v.price ?? Infinity));
      return minA - minB;
    }
    if (productSortBy === 'price-desc') {
      const maxA = Math.max(...a.variants.map((v) => v.price ?? 0));
      const maxB = Math.max(...b.variants.map((v) => v.price ?? 0));
      return maxB - maxA;
    }
    if (productSortBy === 'name') {
      return a.name.localeCompare(b.name, language);
    }
    // Newest
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Featured and Best Sellers
  const featuredProducts = products.filter((p) => p.isFeatured && p.isActive);
  const bestSellerProducts = products.filter((p) => p.isBestSeller && p.isActive);

  // Similar products for active detail modal
  const similarProducts = selectedProduct
    ? products.filter((p) => p.categoryId === selectedProduct.categoryId && p.id !== selectedProduct.id).slice(0, 4)
    : [];

  if (isLoading || !settings || !splashMinimumElapsed) {
    return (
      <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#FFF7F5] px-5 py-8 text-[#5B2638]">
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-8 h-64 w-64 rounded-full bg-[#F8C9D9]/55 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-[#FBE8D8]/70 blur-3xl" />

        <div className="relative z-10 mx-auto flex w-full max-w-sm flex-col items-center text-center animate-in fade-in duration-700">
          <TulipOpeningMark className="mb-1 h-auto w-60 max-w-[72vw] drop-shadow-[0_12px_18px_rgba(199,65,105,0.10)] sm:w-64" />

          <div className="mt-7 space-y-2">
            <p className="text-xl font-bold leading-relaxed text-[#B83F6B]">
              لقد تم اختيار منتجك بكل عناية
            </p>
            <p className="text-base font-semibold leading-8 text-[#6A4552]">
              ليضيف لمسة من الجمال والتميز إلى يومك.
            </p>
          </div>

          <div className="mt-8 h-1 w-24 overflow-hidden rounded-full bg-[#F4D5E0]">
            <div className="h-full w-2/5 rounded-full bg-[#C94F7B] animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF9F7] text-[#5B2638] selection:bg-[#F8D7E3] dark:selection:bg-[#6A2035] selection:text-[#832742] dark:selection:text-[#FCE8EF] transition-colors duration-200">
      {/* 1. Header & Navigation */}
      <Navbar
        settings={settings}
        favoritesCount={favorites.length}
        activeTab={activeTab}
        language={language}
        theme={theme}
        onNavigate={handleNavigate}
        onOpenFavorites={() => {
          setActiveTab('products');
          setShowFavoritesOnly(true);
        }}
        onOpenSearch={() => setIsSearchOpen(true)}
        onToggleTheme={handleToggleTheme}
        onToggleLanguage={handleToggleLanguage}
      />

      {/* Main Content Sections */}
      <main className="flex-1">
        {/* -------------------------------------------------------------
            VIEW 1: HOME PAGE
        ------------------------------------------------------------- */}
        {activeTab === 'home' && (
          <div>
            {/* Hero Section */}
            <Hero
              settings={settings}
              language={language}
              onShopClick={() => handleNavigate('products')}
              onExploreClick={() => {
                const sec = document.getElementById('categories-preview');
                sec?.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            {/* Categories Section Preview */}
            <div id="categories-preview">
              <CategoriesSection
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                language={language}
                onSelectCategory={(catId) => handleNavigate('products', catId)}
              />
            </div>

            {/* Featured Products Showcase */}
            {featuredProducts.length > 0 && (
              <section className="py-14 sm:py-20 bg-[#FAF7F3] dark:bg-[#151816] border-y border-[#F0EBE6] dark:border-[#222724] transition-colors duration-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-start">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-[#C74169] dark:text-[#E06287] bg-[#FFF0F4] dark:bg-[#2A161E] px-3 py-1 rounded-full mb-3 border border-[#F5E1E8] dark:border-[#3D202B]">
                        <Sparkles className="w-3.5 h-3.5 text-[#C74169] dark:text-[#E06287]" />
                        <span>{t.exceptionalPicks}</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1F2421] dark:text-white tracking-tight">
                        {t.featuredProducts}
                      </h2>
                    </div>
                    <button
                      onClick={() => handleNavigate('products')}
                      className="text-xs font-bold text-[#C74169] dark:text-[#E06287] hover:text-[#B3355A] flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                    >
                      <span>{t.viewAllProducts}</span>
                      {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {featuredProducts.slice(0, 4).map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isFavorite={favorites.includes(product.id)}
                        language={language}
                        onToggleFavorite={handleToggleFavorite}
                        onViewDetails={(p) => setSelectedProduct(p)}
                        onOrder={(p) => handleStartOrder(p)}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Best Sellers Section */}
            {bestSellerProducts.length > 0 && (
              <section className="py-14 sm:py-20 bg-[#FCFCFA] dark:bg-[#121513] transition-colors duration-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-start">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-[#3B6948] dark:text-[#529E67] bg-[#F0F5F1] dark:bg-[#1A2E20] px-3 py-1 rounded-full mb-3 border border-[#E0EBE2] dark:border-[#2A4833]">
                        <Flower2 className="w-3.5 h-3.5 text-[#3B6948] dark:text-[#529E67]" />
                        <span>{t.trustedLove}</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1F2421] dark:text-white tracking-tight">
                        {t.bestSellers}
                      </h2>
                    </div>
                    <button
                      onClick={() => {
                        handleNavigate('products');
                        setFilterBestSellersOnly(true);
                      }}
                      className="text-xs font-bold text-[#3B6948] dark:text-[#529E67] hover:text-[#2D5237] flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                    >
                      <span>{t.bestSellers}</span>
                      {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {bestSellerProducts.slice(0, 4).map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isFavorite={favorites.includes(product.id)}
                        language={language}
                        onToggleFavorite={handleToggleFavorite}
                        onViewDetails={(p) => setSelectedProduct(p)}
                        onOrder={(p) => handleStartOrder(p)}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Brand Philosophy & Craftsmanship Section */}
            <section className="py-16 sm:py-24 bg-gradient-to-b from-[#FFFDFD] to-[#FAF6F3] dark:from-[#151917] dark:to-[#121513] border-t border-[#F0EBE6] dark:border-[#222724] transition-colors duration-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                  <div className="lg:col-span-6 space-y-6 text-start">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#C74169] dark:text-[#E06287] bg-[#FFF0F4] dark:bg-[#2A161E] px-3.5 py-1.5 rounded-full border border-[#F5E1E8] dark:border-[#3D202B]">
                      <Leaf className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'فلسفة توليب للعناية الطبيعية' : 'Tolipe Natural Care Philosophy'}</span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#1F2421] dark:text-white leading-tight">
                      {t.philosophyTitle}
                    </h2>

                    <p className="text-sm sm:text-base text-[#555C57] dark:text-[#A8B0AA] leading-relaxed">
                      {t.philosophyDesc}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                      <div className="p-4 rounded-2xl bg-white dark:bg-[#181C19] border border-[#EFE9E2] dark:border-[#262C28] space-y-1">
                        <h4 className="text-xs font-bold text-[#1F2421] dark:text-white">{t.noHarmfulChemicals}</h4>
                        <p className="text-xs text-[#717772] dark:text-[#8D9690]">{t.noHarmfulChemicalsDesc}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white dark:bg-[#181C19] border border-[#EFE9E2] dark:border-[#262C28] space-y-1">
                        <h4 className="text-xs font-bold text-[#1F2421] dark:text-white">{t.fastOrder}</h4>
                        <p className="text-xs text-[#717772] dark:text-[#8D9690]">{t.codDisclaimer}</p>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-6">
                    <div className="relative rounded-3xl overflow-hidden shadow-xl border border-[#EDE4DE] dark:border-[#2D332F] aspect-[4/3] bg-white dark:bg-[#181C19]">
                      <img
                        src="/src/assets/images/product_moroccan_collection_1795590419516.jpg"
                        alt="Natural care"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* -------------------------------------------------------------
            VIEW 2: FULL PRODUCTS CATALOG
        ------------------------------------------------------------- */}
        {activeTab === 'products' && (
          <div className="py-10 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-start">
            {/* Header */}
            <div className="mb-8 space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#717772] dark:text-[#8D9690]">
                <button onClick={() => handleNavigate('home')} className="hover:text-[#1F2421] dark:hover:text-white">
                  {t.home}
                </button>
                <span>/</span>
                <span className="text-[#C74169] dark:text-[#E06287] font-semibold">
                  {showFavoritesOnly ? t.favorites : t.allProducts}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1F2421] dark:text-white">
                {showFavoritesOnly ? t.favorites : t.allProducts}
              </h1>
              <p className="text-xs sm:text-sm text-[#555C57] dark:text-[#A8B0AA]">
                {t.categoriesSub}
              </p>
            </div>

            {/* Category Filter Horizontal Scroll Tabs */}
            {!showFavoritesOnly && (
              <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar border-b border-[#F0EBE6] dark:border-[#262C28]">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId('all')}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategoryId === 'all'
                      ? 'bg-[#1F2421] text-white dark:bg-[#D45278] shadow-sm'
                      : 'bg-white dark:bg-[#1A1E1B] text-[#555C57] dark:text-[#D1D8D3] border border-[#E5DFD7] dark:border-[#2D332F] hover:border-[#1F2421]'
                  }`}
                >
                  {t.allProducts} ({products.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCategoryId === cat.id
                        ? 'bg-[#1F2421] text-white dark:bg-[#D45278] shadow-sm'
                        : 'bg-white dark:bg-[#1A1E1B] text-[#555C57] dark:text-[#D1D8D3] border border-[#E5DFD7] dark:border-[#2D332F] hover:border-[#1F2421]'
                    }`}
                  >
                    {cat.name} ({products.filter((p) => p.categoryId === cat.id).length})
                  </button>
                ))}
              </div>
            )}

            {/* Filter & Sort Bar */}
            <div className="bg-[#FAF8F5] dark:bg-[#181C19] p-4 rounded-2xl border border-[#EFE9E2] dark:border-[#262C28] mb-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              {/* Search in products */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={filterSearchQuery}
                  onChange={(e) => setFilterSearchQuery(e.target.value)}
                  placeholder={t.quickSearchInProducts}
                  className="w-full pe-9 ps-3 py-2 rounded-xl border border-[#D9D2C9] dark:border-[#2D332F] text-xs bg-white dark:bg-[#1E2320] text-[#1F2421] dark:text-white focus:outline-none focus:border-[#C74169]"
                />
                <Search className="w-4 h-4 text-[#9CA3AF] absolute end-3 top-2.5" />
              </div>

              {/* Toggles & Sort dropdown */}
              <div className="flex flex-wrap items-center gap-3">
                {/* In stock toggle */}
                <button
                  type="button"
                  onClick={() => setFilterInStockOnly(!filterInStockOnly)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    filterInStockOnly
                      ? 'bg-[#EBF5ED] dark:bg-[#1A3320] text-[#25D366] dark:text-[#42E67D] border-[#C6ECD1] dark:border-[#295634]'
                      : 'bg-white dark:bg-[#1E2320] text-[#555C57] dark:text-[#A8B0AA] border-[#D9D2C9] dark:border-[#2D332F]'
                  }`}
                >
                  {t.inStockOnly}
                </button>

                {/* Best seller toggle */}
                <button
                  type="button"
                  onClick={() => setFilterBestSellersOnly(!filterBestSellersOnly)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    filterBestSellersOnly
                      ? 'bg-[#FFF0F4] dark:bg-[#2A161E] text-[#C74169] dark:text-[#E06287] border-[#F5E1E8] dark:border-[#3D202B]'
                      : 'bg-white dark:bg-[#1E2320] text-[#555C57] dark:text-[#A8B0AA] border-[#D9D2C9] dark:border-[#2D332F]'
                  }`}
                >
                  {t.bestSellersOnly}
                </button>

                {/* Sort dropdown */}
                <select
                  value={productSortBy}
                  onChange={(e) => setProductSortBy(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-[#D9D2C9] dark:border-[#2D332F] text-xs bg-white dark:bg-[#1E2320] text-[#1F2421] dark:text-white focus:outline-none"
                >
                  <option value="newest">{t.sortByNewest}</option>
                  <option value="price-asc">{t.sortByPriceAsc}</option>
                  <option value="price-desc">{t.sortByPriceDesc}</option>
                  <option value="name">{t.sortByName}</option>
                </select>
              </div>
            </div>

            {/* Products Grid */}
            {sortedProducts.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-white dark:bg-[#181C19] rounded-3xl border border-[#EFE9E2] dark:border-[#262C28] p-8">
                <p className="text-base font-bold text-[#1F2421] dark:text-white">{t.noProductsFound}</p>
                <p className="text-xs text-[#717772] dark:text-[#8D9690]">
                  {language === 'ar' ? 'جربي إعادة ضبط خيارات الفلترة أو تصفح كافة الأقسام.' : 'Try adjusting your filters or browse all categories.'}
                </p>
                <button
                  onClick={() => {
                    setSelectedCategoryId('all');
                    setFilterInStockOnly(false);
                    setFilterBestSellersOnly(false);
                    setFilterSearchQuery('');
                    setShowFavoritesOnly(false);
                  }}
                  className="px-5 py-2.5 rounded-full bg-[#1F2421] dark:bg-[#2D332F] text-white text-xs font-bold hover:bg-[#C74169] transition-all"
                >
                  {t.resetFilters}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedProducts.map((product) => (
                  <ProductCard
                        key={product.id}
                        product={product}
                        isFavorite={favorites.includes(product.id)}
                        language={language}
                        onToggleFavorite={handleToggleFavorite}
                        onViewDetails={(p) => setSelectedProduct(p)}
                        onOrder={(p) => handleStartOrder(p)}
                      />
                ))}
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------
            VIEW 3: CATEGORIES VIEW
        ------------------------------------------------------------- */}
        {activeTab === 'categories' && (
          <div className="py-10 sm:py-16">
            <CategoriesSection
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              language={language}
              onSelectCategory={(catId) => handleNavigate('products', catId)}
            />
          </div>
        )}

        {/* -------------------------------------------------------------
            VIEW 4: ABOUT US
        ------------------------------------------------------------- */}
        {activeTab === 'about' && (
          <div className="py-12 sm:py-20 max-w-4xl mx-auto px-4 sm:px-6 text-start space-y-8">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase text-[#C74169] dark:text-[#E06287] bg-[#FFF0F4] dark:bg-[#2A161E] px-3.5 py-1.5 rounded-full">
                {t.about}
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-[#1F2421] dark:text-white">
                {language === 'ar' ? 'عن متجر توليب للعناية الطبيعية' : 'About Tolipe Natural Care'}
              </h1>
              <p className="text-sm text-[#717772] dark:text-[#8D9690]">
                {t.brandBadge}
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#181C19] border border-[#EFE9E2] dark:border-[#262C28] shadow-sm space-y-4 text-sm text-[#4A4E4B] dark:text-[#D1D8D3] leading-relaxed">
              <p>{settings.aboutUsText}</p>
              <p>
                {t.philosophyDesc}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-[#181C19] border border-[#EFE9E2] dark:border-[#262C28] space-y-2">
                <Leaf className="w-6 h-6 text-[#3B6948] dark:text-[#529E67]" />
                <h3 className="font-bold text-sm text-[#1F2421] dark:text-white">{t.natural100}</h3>
                <p className="text-xs text-[#717772] dark:text-[#8D9690]">{t.natural100Sub}</p>
              </div>
              <div className="p-5 rounded-2xl bg-white dark:bg-[#181C19] border border-[#EFE9E2] dark:border-[#262C28] space-y-2">
                <ShieldCheck className="w-6 h-6 text-[#C74169] dark:text-[#E06287]" />
                <h3 className="font-bold text-sm text-[#1F2421] dark:text-white">{t.noHarmfulChemicals}</h3>
                <p className="text-xs text-[#717772] dark:text-[#8D9690]">{t.noHarmfulChemicalsDesc}</p>
              </div>
              <div className="p-5 rounded-2xl bg-white dark:bg-[#181C19] border border-[#EFE9E2] dark:border-[#262C28] space-y-2">
                <Truck className="w-6 h-6 text-[#2563EB] dark:text-[#60A5FA]" />
                <h3 className="font-bold text-sm text-[#1F2421] dark:text-white">{t.fastOrder}</h3>
                <p className="text-xs text-[#717772] dark:text-[#8D9690]">{t.codDisclaimer}</p>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            VIEW 5: CONTACT US
        ------------------------------------------------------------- */}
        {activeTab === 'contact' && (
          <div className="py-12 sm:py-20 max-w-4xl mx-auto px-4 sm:px-6 text-start space-y-8">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase text-[#25D366] bg-[#EBF8EE] dark:bg-[#1A3121] px-3.5 py-1.5 rounded-full">
                {t.contact}
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-[#1F2421] dark:text-white">
                {t.contactTitle}
              </h1>
              <p className="text-sm text-[#717772] dark:text-[#8D9690]">
                {t.contactSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* WhatsApp Card */}
              <div className="p-6 rounded-3xl bg-[#EBF8EE] dark:bg-[#152B1B] border border-[#C6ECD1] dark:border-[#204E2D] space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#25D366] text-white flex items-center justify-center">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1F2421] dark:text-white">{t.ownerWhatsApp}</h3>
                  <p className="text-xs text-[#1E5C31] dark:text-[#5BE886] mt-1">
                    {t.ownerWhatsAppDesc}
                  </p>
                  <p className="text-sm font-mono font-bold text-[#1F2421] dark:text-white mt-2" dir="ltr">
                    +967 {settings.whatsappPhone}
                  </p>
                </div>
                <a
                  href={settings.whatsappOfficialLink || `https://wa.me/967${settings.whatsappPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-2xl bg-[#25D366] hover:bg-[#20BA57] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{t.startChatNow}</span>
                </a>
              </div>

              {/* Social & Delivery Coverage */}
              <div className="p-6 rounded-3xl bg-white dark:bg-[#181C19] border border-[#EFE9E2] dark:border-[#262C28] space-y-4 shadow-sm">
                <h3 className="text-lg font-bold text-[#1F2421] dark:text-white">{t.otherChannels}</h3>
                <div className="space-y-3 text-xs">
                  <a
                    href={settings.facebookUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl border border-[#D9D2C9] dark:border-[#2D332F] hover:border-[#1877F2] transition-colors"
                  >
                    <span className="font-semibold text-[#1F2421] dark:text-white">{t.facebookOfficial}</span>
                    <Facebook className="w-4 h-4 text-[#1877F2]" />
                  </a>

                  <a
                    href={settings.instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl border border-[#D9D2C9] dark:border-[#2D332F] hover:border-[#E1306C] transition-colors"
                  >
                    <span className="font-semibold text-[#1F2421] dark:text-white">{t.instagramAccount}</span>
                    <Instagram className="w-4 h-4 text-[#E1306C]" />
                  </a>
                </div>

                <div className="pt-2 text-xs text-[#717772] dark:text-[#8D9690] space-y-1">
                  <p className="font-bold text-[#1F2421] dark:text-white">{language === 'ar' ? 'مناطق التغطية:' : 'Coverage:'}</p>
                  <p>{t.deliveryCoverageText}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer
        settings={settings}
        categories={categories}
        language={language}
        theme={theme}
        activeTab={activeTab}
        onNavigate={handleNavigate}
        onOpenPolicy={(pType) => setPolicyType(pType)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onToggleTheme={handleToggleTheme}
        onToggleLanguage={handleToggleLanguage}
      />

      {/* -------------------------------------------------------------
          MODALS & DRAWERS
      ------------------------------------------------------------- */}

      {/* Single-product delivery form */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        product={checkoutProduct}
        initialVariantId={checkoutVariantId}
        initialQuantity={checkoutQuantity}
        settings={settings}
        language={language}
        onClose={() => {
          setIsCheckoutOpen(false);
          setCheckoutProduct(null);
          setCheckoutVariantId('');
          setCheckoutQuantity(1);
        }}
        onOrderSuccess={(order, whatsappUrl) => {
          setIsCheckoutOpen(false);
          setCheckoutProduct(null);
          setCheckoutVariantId('');
          setCheckoutQuantity(1);
          setCompletedOrder({ order, whatsappUrl });
        }}
      />

      {/* Order Success & WhatsApp Launcher Modal */}
      <OrderSuccessModal
        order={completedOrder?.order ?? null}
        whatsappUrl={completedOrder?.whatsappUrl ?? ''}
        settings={settings}
        language={language}
        onClose={() => setCompletedOrder(null)}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        similarProducts={similarProducts}
        isFavorite={selectedProduct ? favorites.includes(selectedProduct.id) : false}
        language={language}
        onClose={() => setSelectedProduct(null)}
        onToggleFavorite={handleToggleFavorite}
        onOrder={handleStartOrder}
        onSelectSimilarProduct={(p) => setSelectedProduct(p)}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        categories={categories}
        language={language}
        onClose={() => setIsSearchOpen(false)}
        onSelectProduct={(p) => setSelectedProduct(p)}
      />

      {/* Store Policies Modal */}
      <PolicyModal
        type={policyType}
        settings={settings}
        language={language}
        onClose={() => setPolicyType(null)}
      />

      {/* Admin Dashboard */}
      <AdminDashboard
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onStoreUpdated={fetchStoreData}
      />

      {/* Floating WhatsApp Live Chat Widget */}
      {settings && (
        <WhatsAppChatWidget
          settings={settings}
          language={language}
        />
      )}
    </div>
  );
}
