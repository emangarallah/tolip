import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { db } from '../db.ts';
import { requireAdmin } from '../middleware/admin-auth.ts';
import { offerIsCurrentlyActive } from '../services/offers.ts';
import { hasPaginationQuery, parsePaginationQuery } from '../pagination.ts';
import type { OrderStatus } from '../../types/store.ts';
import { getDeliveryOptionForGovernorate } from '../../utils/yemen-governorates.ts';

const router = Router();

// ==========================================
// 4. Orders & WhatsApp Checkout API
// ==========================================
router.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const { customerDetails, items } = req.body;

    const requiredCustomerFields = ['fullName', 'phone', 'city', 'area', 'detailedAddress'];
    if (
      !customerDetails ||
      requiredCustomerFields.some((field) =>
        typeof customerDetails[field] !== 'string' || !customerDetails[field].trim()
      )
    ) {
      res.status(400).json({ error: 'يرجى استكمال الاسم ورقم الهاتف والمدينة والمنطقة والعنوان التفصيلي.' });
      return;
    }
    const normalizedCustomerPhone = customerDetails.phone.replace(/[^0-9]/g, '');
    if (!/^\+?[0-9]{7,15}$/.test(normalizedCustomerPhone)) {
      res.status(400).json({ error: 'رقم هاتف العميل غير صحيح.' });
      return;
    }

    const safeCustomerDetails = {
      fullName: customerDetails.fullName.trim(),
      phone: customerDetails.phone.trim(),
      city: customerDetails.city.trim(),
      area: customerDetails.area.trim(),
      detailedAddress: customerDetails.detailedAddress.trim(),
      ...(typeof customerDetails.nearestLandmark === 'string' && customerDetails.nearestLandmark.trim()
        ? { nearestLandmark: customerDetails.nearestLandmark.trim() } : {}),
      ...(typeof customerDetails.notes === 'string' && customerDetails.notes.trim()
        ? { notes: customerDetails.notes.trim() } : {}),
      ...(typeof customerDetails.preferredContactTime === 'string' && customerDetails.preferredContactTime.trim()
        ? { preferredContactTime: customerDetails.preferredContactTime.trim() } : {}),
      ...(typeof customerDetails.googleMapsUrl === 'string' && customerDetails.googleMapsUrl.trim()
        ? { googleMapsUrl: customerDetails.googleMapsUrl.trim() } : {}),
    };

    // Accept one direct item or multiple cart items; all prices and stock are verified server-side.
    if (!Array.isArray(items) || items.length < 1 || items.length > 25) {
      res.status(400).json({ error: 'يرجى اختيار منتج واحد على الأقل، وبحد أقصى 25 منتجًا مختلفًا.' });
      return;
    }

    const normalizedItems: Array<{ product: any; variant: any; quantity: number }> = [];
    const itemIndexes = new Map<string, number>();

    for (const requestedItem of items) {
      if (!requestedItem || typeof requestedItem.productId !== 'string' || requestedItem.productId.length > 128 ||
          typeof requestedItem.variantId !== 'string' || requestedItem.variantId.length > 128) {
        res.status(400).json({ error: 'بيانات أحد المنتجات أو الأحجام المختارة غير مكتملة.' });
        return;
      }

      const product = db.getProductById(String(requestedItem.productId));
      if (!product || !product.isActive || !product.inStock) {
        res.status(400).json({ error: 'أحد المنتجات غير متوفر حاليًا. يرجى تحديث السلة.' });
        return;
      }

      const variant = product.variants.find((entry: any) => entry.id === String(requestedItem.variantId));
      if (!variant || Number(variant.stock) <= 0) {
        res.status(400).json({ error: 'أحد الأحجام أو الأنواع المختارة غير متوفر.' });
        return;
      }

      const quantity = requestedItem.quantity;
      if (typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
        res.status(400).json({ error: 'الكمية المطلوبة غير صحيحة.' });
        return;
      }

      const key = `${product.id}_${variant.id}`;
      const existingIndex = itemIndexes.get(key);
      if (existingIndex !== undefined) {
        normalizedItems[existingIndex].quantity += quantity;
        if (normalizedItems[existingIndex].quantity > Math.min(99, Number(variant.stock))) {
          res.status(400).json({ error: 'الكمية المطلوبة أكبر من المخزون المتاح.' });
          return;
        }
      } else {
        if (quantity > Math.min(99, Number(variant.stock))) {
          res.status(400).json({ error: 'الكمية المطلوبة أكبر من المخزون المتاح.' });
          return;
        }
        itemIndexes.set(key, normalizedItems.length);
        normalizedItems.push({ product, variant, quantity });
      }
    }

    const requestedOfferId = typeof req.body.offerId === 'string' ? req.body.offerId : '';
    const appliedOffer = requestedOfferId ? db.getOfferById(requestedOfferId) : undefined;
    if (requestedOfferId && (!appliedOffer || !offerIsCurrentlyActive(appliedOffer))) { res.status(400).json({ error: 'العرض غير متاح أو انتهت صلاحيته.' }); return; }
    if (appliedOffer && !['percentage', 'fixed'].includes(appliedOffer.type)) { res.status(400).json({ error: 'هذا العرض يحتاج تأكيدًا عبر واتساب ولا يمكن تطبيقه على طلب منتج منفرد.' }); return; }
    if (appliedOffer && normalizedItems.some((item) => !appliedOffer.productIds.includes(item.product.id))) { res.status(400).json({ error: 'العرض لا يشمل المنتج المحدد.' }); return; }

    let itemsTotal: number | null = 0;
    let hasUnpricedItem = false;
    const formattedItems = normalizedItems.map(({ product, variant, quantity }) => {
      const basePrice = typeof variant.price === 'number' ? variant.price : null;
      const price = basePrice !== null && appliedOffer ? Math.round(Math.max(0, appliedOffer.type === 'percentage' ? basePrice * (1 - appliedOffer.value / 100) : basePrice - appliedOffer.value)) : basePrice;
      const itemSubtotal = price !== null ? price * quantity : null;
      if (itemSubtotal === null) {
        hasUnpricedItem = true;
        itemsTotal = null;
      } else if (itemsTotal !== null) {
        itemsTotal += itemSubtotal;
      }
      return {
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        variantName: variant.name,
        quantity,
        unitPrice: price,
        totalPrice: itemSubtotal,
        priceYerNorth: typeof variant.priceYerNorth === 'number' ? variant.priceYerNorth : null,
        priceYerSouth: typeof variant.priceYerSouth === 'number' ? variant.priceYerSouth : null,
        priceSar: typeof variant.priceSar === 'number' ? variant.priceSar : null,
        image: product.images?.[0],
      };
    });

    if (hasUnpricedItem) itemsTotal = null;

    // Delivery fees are read from store settings on the server, never trusted from the browser.
    const storeSettings = db.getSettings();
    const requestedCity = String(customerDetails.city).trim();
    const cityOption = getDeliveryOptionForGovernorate(storeSettings.cities, requestedCity);
    const calculatedDeliveryFee =
      cityOption && typeof cityOption.fee === 'number' ? cityOption.fee : null;
    const finalTotal = itemsTotal !== null && calculatedDeliveryFee !== null ? itemsTotal + calculatedDeliveryFee : itemsTotal;

    // Compose formatted Arabic WhatsApp message
    const itemsListText = formattedItems.map((item, idx) => {
      const priceStr = item.unitPrice !== null ? `${item.unitPrice.toLocaleString('ar-YE')} ر.ي` : 'يحدد عبر واتساب';
      const totalStr = item.totalPrice !== null ? `${item.totalPrice.toLocaleString('ar-YE')} ر.ي` : 'يحدد عبر واتساب';
      const regionalPricesText = [
        { label: 'الريال اليمني الشمالي (ري)', value: item.priceYerNorth },
        { label: 'الريال اليمني الجنوبي (ري ج)', value: item.priceYerSouth },
        { label: 'الريال السعودي (رس)', value: item.priceSar },
      ]
        .filter((entry): entry is { label: string; value: number } =>
          typeof entry.value === 'number' && Number.isFinite(entry.value)
        )
        .map((entry) => `   ${entry.label}: ${entry.value.toLocaleString('ar-YE')}`)
        .join('\n');
      return `${idx + 1}. *${item.productName}*\n   الحجم/النوع: ${item.variantName}\n   الكمية: ${item.quantity}\n   الأسعار بالعملات المسجلة:\n${regionalPricesText || '   لا توجد أسعار مسجلة بالعملات الثلاث'}\n   السعر: ${priceStr}\n   الإجمالي: ${totalStr}`;
    }).join('\n\n');

    const itemsTotalStr = itemsTotal !== null ? `${itemsTotal.toLocaleString('ar-YE')} ريال يمني` : 'تحدد الأسعار بعد التأكيد';
    const deliveryFeeStr = calculatedDeliveryFee !== null ? `${calculatedDeliveryFee.toLocaleString('ar-YE')} ريال يمني` : 'تحدد رسوم التوصيل عبر واتساب';
    const finalTotalStr = finalTotal !== null ? `${finalTotal.toLocaleString('ar-YE')} ريال يمني` : 'يحدد الإجمالي بعد مراجعة العنوان والتوصيل';

    let addressSection = `الاسم: ${customerDetails.fullName.trim()}
رقم الهاتف: ${customerDetails.phone.trim()}
المدينة: ${customerDetails.city.trim()}
المنطقة/الحي: ${customerDetails.area ? customerDetails.area.trim() : 'غير محدد'}
العنوان التفصيلي: ${customerDetails.detailedAddress.trim()}
أقرب معلم: ${customerDetails.nearestLandmark ? customerDetails.nearestLandmark.trim() : 'لا يوجد'}`;

    if (customerDetails.notes) {
      addressSection += `\nملاحظات التوصيل: ${customerDetails.notes.trim()}`;
    }
    if (customerDetails.preferredContactTime) {
      addressSection += `\nالوقت المناسب للتواصل: ${customerDetails.preferredContactTime.trim()}`;
    }
    if (customerDetails.googleMapsUrl) {
      addressSection += `\nرابط الموقع (خرائط جوجل): ${customerDetails.googleMapsUrl.trim()}`;
    }

    const orderNumber = `TLP-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const whatsappMessage = `مرحبًا متجر توليب للعناية الطبيعية.

أرغب في تأكيد طلب جديد رقم: [${orderNumber}]

بيانات العميل:
${addressSection}

تفاصيل الطلب:
${itemsListText}

${appliedOffer ? 'العرض المطبق: ' + appliedOffer.title + ' (' + (appliedOffer.type === 'percentage' ? appliedOffer.value + '%' : appliedOffer.value.toLocaleString('ar-YE') + ' ر.ي') + ')\n' : ''}إجمالي المنتجات: ${itemsTotalStr}
رسوم التوصيل: ${deliveryFeeStr}
الإجمالي النهائي: ${finalTotalStr}

أرجو تأكيد توفر المنتجات وتحديد رسوم التوصيل وموعد التسليم وطريقة الدفع المناسبة.

شكرًا لكم.`;

    const orderWithMessage = await db.createOrderInStore({
      customerDetails: safeCustomerDetails,
      items: formattedItems,
      itemsTotal,
      deliveryFee: calculatedDeliveryFee,
      deliveryFeeNote: calculatedDeliveryFee === null ? 'تحدد رسوم التوصيل عبر واتساب' : undefined,
      finalTotal,
      status: 'awaiting_whatsapp_confirmation',
      whatsappMessage,
    }, orderNumber);

    // Build the direct WhatsApp URL
    const targetPhone = String(storeSettings.whatsappPhone || '').replace(/\D/g, '');
    const fullPhone = targetPhone.startsWith('967') ? targetPhone : `967${targetPhone}`;
    if (!/^[0-9]{10,15}$/.test(fullPhone)) {
      res.status(503).json({ error: 'رقم واتساب المتجر غير مضبوط. يرجى التواصل مع صاحبة المتجر.' });
      return;
    }
    const encodedMsg = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://wa.me/${fullPhone}?text=${encodedMsg}`;

    res.status(201).json({
      success: true,
      order: orderWithMessage,
      whatsappUrl,
      officialStoreLink: storeSettings.whatsappOfficialLink,
    });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'فشل في حفظ الطلب' });
  }
});

router.post('/api/orders/track', (req: Request, res: Response) => {
  try {
    const orderNumber = typeof req.body?.orderNumber === 'string' ? req.body.orderNumber.trim() : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.replace(/[^0-9]/g, '') : '';
    if (!orderNumber || orderNumber.length > 64 || !/^[0-9]{7,15}$/.test(phone)) {
      res.status(400).json({ error: 'يرجى إدخال رقم الطلب ورقم الهاتف الصحيح.' });
      return;
    }

    const candidates = db.getOrders({ search: orderNumber });
    const order = candidates.find((entry: any) => entry.orderNumber.toLowerCase() === orderNumber.toLowerCase());
    const savedPhone = order?.customerDetails?.phone?.replace(/[^0-9]/g, '') || '';
    if (!order || savedPhone !== phone) {
      res.status(404).json({ error: 'لم يتم العثور على طلب مطابق. تحقق من رقم الطلب ورقم الهاتف.' });
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item: any) => ({
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
      })),
      itemsTotal: order.itemsTotal,
      deliveryFee: order.deliveryFee,
      finalTotal: order.finalTotal,
      deliveryFeeNote: order.deliveryFeeNote,
    });
  } catch (err) {
    console.error('Order tracking error:', err);
    res.status(500).json({ error: 'تعذر جلب حالة الطلب حاليًا.' });
  }
});

router.get('/api/orders', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const allowedStatuses: OrderStatus[] = [
      'new', 'awaiting_whatsapp_confirmation', 'confirmed',
      'processing', 'out_for_delivery', 'delivered', 'cancelled',
    ];
    if (status !== undefined && status !== 'all' &&
        (typeof status !== 'string' || !allowedStatuses.includes(status as OrderStatus))) {
      res.status(400).json({ error: 'مرشح حالة الطلب غير صحيح.' });
      return;
    }
    if (search !== undefined && (typeof search !== 'string' || search.length > 120)) {
      res.status(400).json({ error: 'عبارة البحث طويلة أو غير صحيحة.' });
      return;
    }
    const filters = {
      status: status === 'all' ? undefined : status as OrderStatus | undefined,
      search: search as string | undefined,
    };

    if (hasPaginationQuery(req.query as Record<string, unknown>)) {
      const parsed = parsePaginationQuery(req.query as Record<string, unknown>);
      if (!parsed.ok) {
        res.status(400).json({ error: parsed.error });
        return;
      }
      const result = await db.getOrdersPage(filters, parsed.value.page, parsed.value.pageSize);
      res.setHeader('Cache-Control', 'no-store');
      res.json(result);
      return;
    }

    res.json(db.getOrders(filters));
  } catch (err) {
    console.error('Orders query failed:', err);
    res.status(500).json({ error: 'فشل في جلب الطلبات' });
  }
});
router.get('/api/orders/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const order = db.getOrderById(req.params.id);
    if (!order) {
      res.status(404).json({ error: 'الطلب غير موجود' });
      return;
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'فشل في جلب تفاصيل الطلب' });
  }
});

const handleAdminOrderStatusUpdate = async (req: Request, res: Response) => {
  try {
    const orderId = typeof req.body?.orderId === 'string'
      ? req.body.orderId
      : req.params.id;
    const status = req.body?.status;
    const allowedStatuses: OrderStatus[] = [
      'new',
      'awaiting_whatsapp_confirmation',
      'confirmed',
      'processing',
      'out_for_delivery',
      'delivered',
      'cancelled',
    ];

    if (!orderId || typeof status !== 'string' || !allowedStatuses.includes(status as OrderStatus)) {
      res.status(400).json({ error: 'بيانات حالة الطلب غير صحيحة.' });
      return;
    }

    const updated = await db.updateOrderStatusInStore(orderId, status as OrderStatus);
    if (!updated) {
      res.status(404).json({ error: 'الطلب غير موجود.' });
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json(updated);
  } catch (err) {
    console.error('Admin order status update failed:', err);
    res.status(500).json({ error: 'فشل في تحديث حالة الطلب. يرجى المحاولة مرة أخرى.' });
  }
};

// Stable POST endpoint used by the admin orders tab.
router.post('/api/orders/status', requireAdmin, handleAdminOrderStatusUpdate);

// Keep the previous PATCH endpoint available for existing clients.
router.patch('/api/orders/:id/status', requireAdmin, handleAdminOrderStatusUpdate);

export default router;
