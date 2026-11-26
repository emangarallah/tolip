import React, { useEffect, useState } from 'react';
import { X, MapPin, Phone, User, MessageCircle, AlertCircle, Navigation, Loader2 } from 'lucide-react';
import type { OrderDraftItem, CustomerDetails, StoreSettings, Order, Product, StoreOffer } from '../types/store.ts';
import { Language, translations } from '../utils/i18n.ts';

interface CheckoutModalProps {
  isOpen: boolean;
  product: Product | null;
  initialVariantId: string;
  initialQuantity: number;
  offerId?: string;
  offer?: StoreOffer;
  settings: StoreSettings;
  language: Language;
  onClose: () => void;
  onOrderSuccess: (order: Order, whatsappUrl: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  product,
  initialVariantId,
  initialQuantity,
  offerId,
  offer,
  settings,
  language,
  onClose,
  onOrderSuccess,
}) => {
  const t = translations[language];
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState(settings.cities[0]?.city || 'صنعاء');
  const [customCity, setCustomCity] = useState('');
  const [area, setArea] = useState('');
  const [detailedAddress, setDetailedAddress] = useState('');
  const [nearestLandmark, setNearestLandmark] = useState('');
  const [notes, setNotes] = useState('');
  const [preferredContactTime, setPreferredContactTime] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [selectedVariantId, setSelectedVariantId] = useState(initialVariantId);
  const [quantity, setQuantity] = useState(initialQuantity || 1);

  useEffect(() => {
    if (!product) return;
    setSelectedVariantId(initialVariantId || product.variants[0]?.id || '');
    setQuantity(Math.max(1, Math.floor(initialQuantity || 1)));
  }, [product?.id, initialVariantId, initialQuantity, isOpen]);

  const selectedVariant =
    product?.variants.find((variant) => variant.id === selectedVariantId) || product?.variants[0];

  const checkoutPrice = selectedVariant?.price !== null && selectedVariant?.price !== undefined && offer
    ? Math.round(Math.max(0, offer.type === 'percentage' ? selectedVariant.price * (1 - offer.value / 100) : selectedVariant.price - offer.value))
    : selectedVariant?.price ?? null;

  const items: OrderDraftItem[] = product && selectedVariant
    ? [{
        id: `${product.id}_${selectedVariant.id}`,
        productId: product.id,
        productName: product.name,
        variantId: selectedVariant.id,
        variantName: selectedVariant.name,
        price: checkoutPrice,
        quantity,
        image: product.images[0] || '/src/assets/images/product_skincare_cream_1795590418002.jpg',
        categoryName: product.categoryName,
      }]
    : [];

  // Selected city info
  const selectedCityObj = settings.cities.find((c) => c.city === city);
  const deliveryFee = city === 'أخرى' || city === 'Other' ? null : selectedCityObj?.fee ?? null;

  // Calculate the subtotal for the selected product.
  const itemsTotal = items.length > 0 && items.every((item) => item.price !== null)
    ? items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0)
    : null;

  const finalTotal = itemsTotal !== null && deliveryFee !== null ? itemsTotal + deliveryFee : itemsTotal;

  // Browser Geolocation integration
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert(language === 'ar' ? 'المتصفح لا يدعم تحديد الموقع التلقائي.' : 'Browser does not support geolocation.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const url = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
        setGoogleMapsUrl(url);
      },
      () => {
        setIsLocating(false);
        alert(language === 'ar' ? 'تعذر جلب موقعك التلقائي.' : 'Unable to retrieve location.');
      },
      { timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validations
    if (!fullName.trim()) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال الاسم الكامل.' : 'Please enter your full name.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال رقم الهاتف.' : 'Please enter your phone number.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 7) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال رقم هاتف صحيح.' : 'Please enter a valid phone number.');
      return;
    }
    const finalCityName = (city === 'أخرى' || city === 'Other') ? customCity.trim() : city;
    if (!finalCityName) {
      setErrorMsg(language === 'ar' ? 'يرجى تحديد المدينة.' : 'Please select your city.');
      return;
    }
    if (!area.trim()) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال المنطقة أو الحي.' : 'Please enter your area or neighborhood.');
      return;
    }
    if (!detailedAddress.trim()) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال العنوان التفصيلي.' : 'Please enter your detailed address.');
      return;
    }
    if (!items.length || !product || !selectedVariant || !product.inStock || selectedVariant.stock <= 0) {
      setErrorMsg(language === 'ar' ? 'المنتج أو الحجم المختار غير متوفر حاليًا.' : 'The selected product or variant is unavailable.');
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > Math.min(selectedVariant.stock, 99)) {
      setErrorMsg(language === 'ar' ? 'يرجى اختيار كمية صحيحة بين 1 و99.' : 'Please choose a quantity between 1 and 99.');
      return;
    }

    const customerDetails: CustomerDetails = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      city: finalCityName,
      area: area.trim() || undefined,
      detailedAddress: detailedAddress.trim(),
      nearestLandmark: nearestLandmark.trim() || undefined,
      notes: notes.trim() || undefined,
      preferredContactTime: preferredContactTime.trim() || undefined,
      googleMapsUrl: googleMapsUrl.trim() || undefined,
    };

    // Open a blank tab during the click gesture so browsers do not block the WhatsApp redirect.
    const whatsappTab = window.open('about:blank', '_blank');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerDetails,
          items,
          deliveryFee,
          offerId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to record order.');
      }

      if (whatsappTab) {
        whatsappTab.location.href = data.whatsappUrl;
      }
      onOrderSuccess(data.order, data.whatsappUrl);
    } catch (err: any) {
      if (whatsappTab && !whatsappTab.closed) whatsappTab.close();
      setErrorMsg(err.message || 'Error creating order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#161917] rounded-3xl shadow-2xl border border-[#EFE9E2] dark:border-[#262C28] overflow-hidden my-auto text-start"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#F0EBE6] dark:border-[#262C28] flex items-center justify-between bg-[#FAF7F3] dark:bg-[#131614]">
          <div>
            <h2 className="text-xl font-bold text-[#1F2421] dark:text-white">{t.deliveryDetailsTitle}</h2>
            <p className="text-xs text-[#717772] dark:text-[#8D9690] mt-0.5">
              {t.deliveryDetailsSubtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-full hover:bg-white dark:hover:bg-[#1E2320] text-[#6B7280] dark:text-[#A8B0AA] hover:text-[#1F2421] dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#FEE2E2] dark:bg-[#3D141A] border border-[#FCA5A5] dark:border-[#6B202A] text-[#991B1B] dark:text-[#FCA5A5] text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Selected product, size and quantity */}
          {product && (
            <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1A1E1B] border border-[#EFE9E2] dark:border-[#262C28] space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#C74169] dark:text-[#E06287]">
                {language === 'ar' ? 'تفاصيل المنتج المطلوب' : 'Selected Product'}
              </h3>
              <div className="flex items-center gap-3">
                <img
                  src={product.images[0] || '/src/assets/images/product_skincare_cream_1795590418002.jpg'}
                  alt={product.name}
                  className="w-16 h-16 rounded-xl object-cover bg-white dark:bg-[#202522]"
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#1F2421] dark:text-white">{product.name}</p>
                  <p className="text-[11px] text-[#717772] dark:text-[#A8B0AA]">{product.categoryName}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2421] dark:text-white mb-1">
                    {t.selectSizeOrType}
                  </label>
                  <select
                    required
                    value={selectedVariantId}
                    onChange={(e) => {
                      setSelectedVariantId(e.target.value);
                      setQuantity(1);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D9D2C9] dark:border-[#2D332F] text-xs bg-white dark:bg-[#1E2320] text-[#1F2421] dark:text-white"
                  >
                    {product.variants.map((variant) => (
                      <option key={variant.id} value={variant.id} disabled={variant.stock <= 0}>
                        {variant.name} — {variant.price !== null
                          ? `${variant.price.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US')} ${t.currencyShort}`
                          : t.determinedAfterAgreement}
                        {variant.stock <= 0 ? (language === 'ar' ? ' (غير متوفر)' : ' (Unavailable)') : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2421] dark:text-white mb-1">
                    {t.quantityRequired}
                  </label>
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-[#D9D2C9] dark:border-[#2D332F] bg-white dark:bg-[#1E2320]">
                    <button
                      type="button"
                      onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                      aria-label="Decrease quantity"
                      className="w-8 h-8 rounded-lg bg-[#F7F4F0] dark:bg-[#282F2B] text-[#1F2421] dark:text-white font-bold"
                    >
                      −
                    </button>
                    <span className="text-sm font-bold tabular-nums text-[#1F2421] dark:text-white">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((current) => Math.min(selectedVariant?.stock || 1, 99, current + 1))}
                      aria-label="Increase quantity"
                      className="w-8 h-8 rounded-lg bg-[#F7F4F0] dark:bg-[#282F2B] text-[#1F2421] dark:text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              {!selectedVariant && (
                <p className="text-xs text-red-600">{language === 'ar' ? 'لا توجد أحجام متاحة لهذا المنتج.' : 'No variants are available.'}</p>
              )}
            </div>
          )}

          {/* Customer basic info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#C74169] dark:text-[#E06287]">
              {t.customerBasicInfo}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="text-xs font-semibold text-[#1F2421] dark:text-white block mb-1">
                  {t.fullName} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t.fullNamePlaceholder}
                    className="w-full pe-10 ps-3 py-2.5 rounded-xl border border-[#D9D2C9] dark:border-[#2D332F] focus:border-[#C74169] text-xs text-[#1F2421] dark:text-white transition-all bg-[#FCFCFA] dark:bg-[#1E2320]"
                  />
                  <User className="w-4 h-4 text-[#9CA3AF] absolute end-3 top-3" />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs font-semibold text-[#1F2421] dark:text-white block mb-1">
                  {t.phoneNumber} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t.phoneNumberPlaceholder}
                    className="w-full pe-10 ps-3 py-2.5 rounded-xl border border-[#D9D2C9] dark:border-[#2D332F] focus:border-[#C74169] text-xs text-[#1F2421] dark:text-white transition-all bg-[#FCFCFA] dark:bg-[#1E2320]"
                  />
                  <Phone className="w-4 h-4 text-[#9CA3AF] absolute end-3 top-3" />
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Location Info */}
          <div className="space-y-4 pt-2 border-t border-[#F0EBE6] dark:border-[#262C28]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#C74169] dark:text-[#E06287]">
              {t.yemenDeliveryAddress}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* City */}
              <div>
                <label className="text-xs font-semibold text-[#1F2421] dark:text-white block mb-1">
                  {t.governorateCity} <span className="text-red-500">*</span>
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#D9D2C9] dark:border-[#2D332F] focus:border-[#C74169] text-xs text-[#1F2421] dark:text-white transition-all bg-[#FCFCFA] dark:bg-[#1E2320]"
                >
                  {settings.cities.map((c) => (
                    <option key={c.city} value={c.city}>
                      {c.city} {c.fee !== null ? `(${c.fee.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US')} ${t.currencyShort})` : `(${t.determinedLater})`}
                    </option>
                  ))}
                  <option value="أخرى">{t.otherCity}</option>
                </select>
              </div>

              {/* Custom City write-in */}
              {(city === 'أخرى' || city === 'Other') && (
                <div>
                  <label className="text-xs font-semibold text-[#1F2421] dark:text-white block mb-1">
                    {t.cityName} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    placeholder={t.writeCityName}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D9D2C9] dark:border-[#2D332F] focus:border-[#C74169] text-xs text-[#1F2421] dark:text-white bg-[#FCFCFA] dark:bg-[#1E2320]"
                  />
                </div>
              )}

              {/* Area / District */}
              <div>
                <label className="text-xs font-semibold text-[#1F2421] dark:text-white block mb-1">
                  {t.areaDistrict} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder={t.areaPlaceholder}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#D9D2C9] dark:border-[#2D332F] focus:border-[#C74169] text-xs text-[#1F2421] dark:text-white bg-[#FCFCFA] dark:bg-[#1E2320]"
                />
              </div>
            </div>

            {/* Detailed Address */}
            <div>
              <label className="text-xs font-semibold text-[#1F2421] dark:text-white block mb-1">
                {t.detailedAddress} <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={detailedAddress}
                onChange={(e) => setDetailedAddress(e.target.value)}
                placeholder={t.detailedAddressPlaceholder}
                className="w-full px-3 py-2.5 rounded-xl border border-[#D9D2C9] dark:border-[#2D332F] focus:border-[#C74169] text-xs text-[#1F2421] dark:text-white bg-[#FCFCFA] dark:bg-[#1E2320]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nearest Landmark */}
              <div>
                <label className="text-xs font-semibold text-[#1F2421] dark:text-white block mb-1">
                  {t.nearestLandmark}
                </label>
                <input
                  type="text"
                  value={nearestLandmark}
                  onChange={(e) => setNearestLandmark(e.target.value)}
                  placeholder={t.nearestLandmarkPlaceholder}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#D9D2C9] dark:border-[#2D332F] focus:border-[#C74169] text-xs text-[#1F2421] dark:text-white bg-[#FCFCFA] dark:bg-[#1E2320]"
                />
              </div>

              {/* Preferred Contact Time */}
              <div>
                <label className="text-xs font-semibold text-[#1F2421] dark:text-white block mb-1">
                  {t.preferredTime}
                </label>
                <input
                  type="text"
                  value={preferredContactTime}
                  onChange={(e) => setPreferredContactTime(e.target.value)}
                  placeholder={t.preferredTimePlaceholder}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#D9D2C9] dark:border-[#2D332F] focus:border-[#C74169] text-xs text-[#1F2421] dark:text-white bg-[#FCFCFA] dark:bg-[#1E2320]"
                />
              </div>
            </div>

            {/* GPS Location Option */}
            <div className="p-3 rounded-2xl bg-[#F6F4EE] dark:bg-[#1B201D] border border-[#E8E2D8] dark:border-[#2A312D] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-[#555C57] dark:text-[#A8B0AA] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#3B6948] dark:text-[#529E67] shrink-0" />
                <span>
                  {googleMapsUrl ? t.gpsSuccess : t.gpsLocationNotice}
                </span>
              </div>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isLocating}
                className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-[#141715] border border-[#D9D2C9] dark:border-[#2D332F] text-xs font-medium text-[#1F2421] dark:text-white hover:bg-[#FAF8F5] dark:hover:bg-[#252B27] transition-colors flex items-center gap-1.5 shrink-0"
              >
                {isLocating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5 text-[#3B6948] dark:text-[#529E67]" />
                )}
                <span>{googleMapsUrl ? t.updateLocation : t.determineLocationNow}</span>
              </button>
            </div>

            {/* Delivery Notes */}
            <div>
              <label className="text-xs font-semibold text-[#1F2421] dark:text-white block mb-1">
                {t.additionalNotes}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.notesPlaceholder}
                className="w-full px-3 py-2.5 rounded-xl border border-[#D9D2C9] dark:border-[#2D332F] focus:border-[#C74169] text-xs text-[#1F2421] dark:text-white bg-[#FCFCFA] dark:bg-[#1E2320]"
              />
            </div>
          </div>

          {/* Order Summary Box */}
          <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1A1E1B] border border-[#EFE9E2] dark:border-[#262C28] space-y-2 text-xs">
            <h4 className="font-bold text-[#1F2421] dark:text-white mb-2">{t.orderSummary} ({items.length} {t.itemsCount}):</h4>

            <div className="space-y-1.5 max-h-32 overflow-y-auto pe-1">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-[#6B7280] dark:text-[#A8B0AA]">
                  <span>
                    {item.productName} ({item.variantName}) × {item.quantity}
                  </span>
                  <span className="font-semibold text-[#1F2421] dark:text-white tabular-nums">
                    {item.price !== null
                      ? `${(item.price * item.quantity).toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US')} ${t.currencyShort}`
                      : t.determinedAfterAgreement}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#EAE3DC] dark:border-[#2D332F] space-y-1">
              <div className="flex justify-between text-[#6B7280] dark:text-[#A8B0AA]">
                <span>{t.productsSubtotal}</span>
                <span className="font-bold tabular-nums text-[#1F2421] dark:text-white">
                  {itemsTotal !== null ? `${itemsTotal.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US')} ${t.currencyShort}` : t.determinedLater}
                </span>
              </div>
              <div className="flex justify-between text-[#6B7280] dark:text-[#A8B0AA]">
                <span>{t.deliveryFee}</span>
                <span className="font-semibold tabular-nums text-[#8C4A5E] dark:text-[#E06287]">
                  {deliveryFee !== null ? `${deliveryFee.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US')} ${t.currencyShort}` : t.deliveryDeterminedViaWhatsApp}
                </span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-[#1F2421] dark:text-white pt-1 border-t border-[#EAE3DC] dark:border-[#2D332F]">
                <span>{t.estimatedTotal}</span>
                <span className="tabular-nums">
                  {finalTotal !== null ? `${finalTotal.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US')} ${t.currency}` : t.determinedAfterAgreement}
                </span>
              </div>
            </div>
          </div>

          {/* Important Confirmation Disclaimer */}
          <div className="p-3.5 rounded-xl bg-[#FFF9F5] dark:bg-[#241B15] border border-[#FDE3D3] dark:border-[#422B1E] text-xs space-y-1">
            <p className="font-bold text-[#8C3A00] dark:text-[#F39C56]">{t.checkoutTermsHeader}</p>
            <p className="text-[#663C1B] dark:text-[#D1AB90] leading-relaxed text-[11px] whitespace-pre-line">
              {t.checkoutTermsText}
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl bg-[#25D366] text-white hover:bg-[#20BA57] font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-75"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t.submittingOrder}</span>
                </>
              ) : (
                <>
                  <MessageCircle className="w-5 h-5" />
                  <span>{t.confirmAndSendWhatsApp.replace('{phone}', settings.whatsappPhone)}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
