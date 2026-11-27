import React, { useEffect, useMemo, useState } from 'react';
import { Tag, Clock, MessageCircle } from 'lucide-react';
import type { Product, StoreOffer } from '../types/store.ts';
import type { StoreSettings } from '../types/store.ts';

interface Props {
  products: Product[];
  settings: StoreSettings;
  onOrder: (product: Product, offer: StoreOffer) => void;
  language: 'ar' | 'en';
}

export const OffersSection: React.FC<Props> = ({ products, settings, onOrder, language }) => {
  const [offers, setOffers] = useState<StoreOffer[]>([]);

  // Product data is fetched by the storefront once and passed into this section.
  // It is deliberately not a dependency of the offers request.
  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/offers', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('تعذر تحميل العروض');
        return response.json();
      })
      .then((data: unknown) => {
        if (!controller.signal.aborted) {
          setOffers(Array.isArray(data) ? data as StoreOffer[] : []);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setOffers([]);
      });

    return () => controller.abort();
  }, []);

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const visible = offers.filter((offer) =>
    offer.isActive &&
    (!offer.startsAt || Date.parse(offer.startsAt) <= Date.now()) &&
    (!offer.endsAt || Date.parse(offer.endsAt) >= Date.now())
  );

  // When the offers tab opens, move the visitor to the available offers
  // after the active offers have finished loading.
  useEffect(() => {
    if (!visible.length) return;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById('available-offers')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [visible.length]);

  if (!visible.length) return null;

  const currency = language === 'ar' ? 'ر.ي' : 'YER';
  const locale = language === 'ar' ? 'ar-YE' : 'en-US';
  const phone = (settings.whatsappPhone || '').replace(/\D/g, '');
  const whatsappPhone = phone.startsWith('967') ? phone : `967${phone}`;

  const calculateOfferPrice = (product: Product, offer: StoreOffer) => {
    const variant = product.variants.find((item) => typeof item.price === 'number');
    if (!variant || variant.price === null) return null;

    const price = variant.price;
    if (offer.type === 'percentage') return Math.round(Math.max(0, price * (1 - offer.value / 100)));
    if (offer.type === 'fixed') return Math.round(Math.max(0, price - offer.value));
    if (offer.type === 'bundle' && offer.bundlePrice != null) return offer.bundlePrice;
    return null;
  };

  const getWhatsAppUrl = (offer: StoreOffer, linkedProducts: Product[]) => {
    const productNames = linkedProducts.map((product) => product.name).join('، ');
    const message = [
      'مرحبًا متجر توليب، أريد الاستفسار وطلب العرض: ' + offer.title,
      offer.description,
      'المنتجات: ' + (productNames || offer.productIds.join('، ')),
      'يرجى تأكيد السعر والتوفر والدفع عند الاستلام.',
    ].join('\n');

    return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <section
      id="available-offers"
      className="scroll-mt-24 border-y border-[#F0EBE6] bg-[#FFF4F7] py-12 sm:py-16 dark:border-[#2B2025] dark:bg-[#1B1518]"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-7 flex items-end justify-between gap-3">
          <div>
            <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#C74169] dark:bg-[#2A161E] dark:text-[#F2A9C3]">
              <Tag className="h-3.5 w-3.5" />
              {language === 'ar' ? 'عروض توليب' : 'Tolip Offers'}
            </span>
            <h2 className="text-2xl font-extrabold text-[#1F2421] dark:text-white">
              {language === 'ar' ? 'عروض وخصومات مميزة' : 'Special Offers'}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-[#A8B0AA]">
              {language === 'ar' ? 'فرص مميزة لفترة محدودة' : 'Special deals for a limited time'}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((offer) => {
            const linkedProducts = offer.productIds
              .map((id) => productsById.get(id))
              .filter((product): product is Product => Boolean(product?.isActive));
            const firstProduct = linkedProducts[0];
            const price = firstProduct ? calculateOfferPrice(firstProduct, offer) : null;
            const whatsappUrl = getWhatsAppUrl(offer, linkedProducts);
            const hasDirectDiscount = offer.type === 'percentage' || offer.type === 'fixed';

            return (
              <article
                key={offer.id}
                className="overflow-hidden rounded-2xl border border-[#F0DDE4] bg-white shadow-sm dark:border-[#3B2A31] dark:bg-[#181C19]"
              >
                {offer.image && (
                  <img src={offer.image} alt={offer.title} className="h-44 w-full object-cover" loading="lazy" />
                )}
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-[#1F2421] dark:text-white">{offer.title}</h3>
                    <span className="shrink-0 rounded-full bg-[#C74169] px-2.5 py-1 text-[11px] font-bold text-white">
                      {offer.type === 'percentage'
                        ? `-${offer.value}%`
                        : offer.type === 'fixed'
                          ? `خصم ${offer.value}`
                          : offer.type === 'bundle'
                            ? 'سعر حزمة'
                            : 'عرض كمية'}
                    </span>
                  </div>

                  {offer.description && <p className="text-sm leading-6 text-gray-500 dark:text-[#A8B0AA]">{offer.description}</p>}
                  <p className="text-xs text-gray-500 dark:text-[#A8B0AA]">{linkedProducts.map((product) => product.name).join('، ')}</p>

                  {firstProduct && price !== null && (
                    <div className="text-sm font-bold text-[#C74169] dark:text-[#E98EAD]">
                      {price.toLocaleString(locale)} {currency}
                      <span className="mr-1 text-xs font-normal text-gray-400 dark:text-[#8D9690]">ابتداءً من</span>
                    </div>
                  )}

                  {offer.endsAt && (
                    <p className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-[#8D9690]">
                      <Clock className="h-3 w-3" />
                      ينتهي {new Date(offer.endsAt).toLocaleDateString(locale)}
                    </p>
                  )}

                  {hasDirectDiscount ? (
                    firstProduct && (
                      <button
                        onClick={() => onOrder(firstProduct, offer)}
                        type="button"
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C74169] py-3 text-sm font-bold text-white transition-colors hover:bg-[#B3355A] dark:bg-[#D45278] dark:hover:bg-[#C74169] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C74169] dark:focus-visible:ring-[#E06287]"
                      >
                        <MessageCircle className="h-4 w-4" />
                        اطلبي العرض عبر واتساب
                      </button>
                    )
                  ) : (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white transition-colors hover:bg-[#20BA57] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]"
                    >
                      <MessageCircle className="h-4 w-4" />
                      استفسري عن العرض عبر واتساب
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
