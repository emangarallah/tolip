import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db, generateToken, verifyToken } from './src/server/db.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Parse JSON and URL-encoded bodies (allowing up to 15MB for custom image uploads)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Ensure upload directory exists
const UPLOADS_DIR = path.resolve(__dirname, 'public/uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

function validateProductVariants(variants: any): string | null {
  if (!Array.isArray(variants) || variants.length < 1 || variants.length > 50) {
    return 'يجب إضافة حجم أو نوع واحد على الأقل للمنتج.';
  }
  const ids = new Set<string>();
  for (const variant of variants) {
    if (!variant || typeof variant.id !== 'string' || !variant.id.trim()) return 'معرّف الحجم أو النوع غير صحيح.';
    if (ids.has(variant.id)) return 'لا يمكن تكرار معرّف الحجم أو النوع.';
    ids.add(variant.id);
    if (typeof variant.name !== 'string' || !variant.name.trim()) return 'اسم الحجم أو النوع مطلوب.';
    if (!Number.isInteger(variant.stock) || variant.stock < 0) return 'المخزون يجب أن يكون عددًا صحيحًا لا يقل عن صفر.';
    if (variant.price !== null && variant.price !== undefined && (!Number.isFinite(variant.price) || variant.price < 0)) {
      return 'سعر المنتج يجب أن يكون رقمًا موجبًا أو يترك فارغًا للاتفاق عبر واتساب.';
    }
    if (variant.originalPrice !== null && variant.originalPrice !== undefined &&
        (!Number.isFinite(variant.originalPrice) || variant.originalPrice < 0)) {
      return 'السعر السابق غير صحيح.';
    }
  }
  return null;
}

// Validate the bearer token against the current admin record, not only its signature.
function getAdminPayload(req: Request): { email: string; id: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const currentAdmin = db.getAdminInfo();
  if (
    payload.id !== currentAdmin.id ||
    payload.email.toLowerCase() !== currentAdmin.email.toLowerCase() ||
    payload.sessionVersion !== db.getAdminSessionVersion()
  ) {
    return null;
  }

  return payload;
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const payload = getAdminPayload(req);
  if (!payload) {
    res.status(401).json({ error: 'غير مصرح لك بالوصول. يرجى تسجيل الدخول كمسؤول.' });
    return;
  }

  (req as any).admin = payload;
  next();
}

const loginAttemptBuckets = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;

function isLoginRateLimited(req: Request): boolean {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let bucket = loginAttemptBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    loginAttemptBuckets.set(key, bucket);
  }
  if (bucket.count >= LOGIN_MAX_ATTEMPTS) return true;
  bucket.count += 1;

  if (loginAttemptBuckets.size > 5000) {
    for (const [ip, attempt] of loginAttemptBuckets) {
      if (attempt.resetAt <= now) loginAttemptBuckets.delete(ip);
    }
  }
  return false;
}

// ==========================================
// 1. Store Settings API
// ==========================================
app.get('/api/settings', (req: Request, res: Response) => {
  try {
    const settings = db.getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'فشل في جلب إعدادات المتجر' });
  }
});

app.put('/api/settings', requireAdmin, (req: Request, res: Response) => {
  try {
    const updated = db.updateSettings(req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'فشل في تحديث إعدادات المتجر' });
  }
});

// ==========================================
// 2. Categories API
// ==========================================
app.get('/api/categories', (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === 'true' && Boolean(getAdminPayload(req));
    const categories = db.getCategories(includeInactive);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'فشل في جلب الأقسام' });
  }
});

app.post('/api/categories', requireAdmin, (req: Request, res: Response) => {
  try {
    const { name, description, image, sortOrder, isActive } = req.body;
    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'اسم القسم مطلوب' });
      return;
    }
    const slug = req.body.slug || name.trim().toLowerCase().replace(/[\s\W-]+/g, '-');
    const newCategory = db.createCategory({
      name: name.trim(),
      slug,
      description: description || '',
      image: image || '/src/assets/images/product_skincare_cream_1795590418002.jpg',
      sortOrder: Number(sortOrder) || 1,
      isActive: isActive !== false,
    });
    res.status(201).json(newCategory);
  } catch (err) {
    res.status(500).json({ error: 'فشل في إنشاء القسم' });
  }
});

app.put('/api/categories/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    if (req.body.name !== undefined && (typeof req.body.name !== 'string' || !req.body.name.trim())) {
      res.status(400).json({ error: 'اسم القسم مطلوب.' });
      return;
    }
    const updated = db.updateCategory(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'القسم غير موجود' });
      return;
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'فشل في تحديث القسم' });
  }
});

app.delete('/api/categories/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const success = db.deleteCategory(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'القسم غير موجود' });
      return;
    }
    res.json({ success: true, message: 'تم حذف القسم بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'فشل في حذف القسم' });
  }
});

// ==========================================
// 3. Products API
// ==========================================
app.get('/api/products', (req: Request, res: Response) => {
  try {
    const { categoryId, search, isFeatured, isBestSeller, inStockOnly, includeInactive, sortBy } = req.query;
    const products = db.getProducts({
      categoryId: categoryId as string,
      search: search as string,
      isFeatured: isFeatured === 'true',
      isBestSeller: isBestSeller === 'true',
      inStockOnly: inStockOnly === 'true',
      includeInactive: includeInactive === 'true' && Boolean(getAdminPayload(req)),
      sortBy: sortBy as any,
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'فشل في جلب المنتجات' });
  }
});

app.get('/api/products/:id', (req: Request, res: Response) => {
  try {
    const product = db.getProductById(req.params.id);
    if (!product || (!product.isActive && !getAdminPayload(req))) {
      res.status(404).json({ error: 'المنتج غير موجود' });
      return;
    }
    // Fetch similar products from the same category
    const similar = db.getProducts({ categoryId: product.categoryId })
      .filter((p) => p.id !== product.id)
      .slice(0, 4);

    res.json({ ...product, similarProducts: similar });
  } catch (err) {
    res.status(500).json({ error: 'فشل في جلب تفاصيل المنتج' });
  }
});

app.post('/api/products', requireAdmin, (req: Request, res: Response) => {
  try {
    const { name, categoryId, description, features, usageInstructions, images, variants, isFeatured, isBestSeller, inStock, isActive } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'اسم المنتج مطلوب' });
      return;
    }
    if (!categoryId || !db.getCategoryById(String(categoryId))) {
      res.status(400).json({ error: 'يجب اختيار قسم موجود للمنتج' });
      return;
    }
    const incomingVariants = Array.isArray(variants) && variants.length > 0
      ? variants
      : [{ id: `v-${crypto.randomUUID()}`, name: 'حجم قياسي', price: null, stock: 10 }];
    const variantsError = validateProductVariants(incomingVariants);
    if (variantsError) {
      res.status(400).json({ error: variantsError });
      return;
    }
    const slug = req.body.slug || name.trim().toLowerCase().replace(/[\s\W-]+/g, '-');
    const newProduct = db.createProduct({
      name: name.trim(),
      slug,
      categoryId,
      description: description || '',
      features: Array.isArray(features) ? features : [],
      usageInstructions: usageInstructions || '',
      images: Array.isArray(images) && images.length > 0 ? images : ['/src/assets/images/product_skincare_cream_1795590418002.jpg'],
      variants: incomingVariants,
      isFeatured: Boolean(isFeatured),
      isBestSeller: Boolean(isBestSeller),
      isActive: isActive !== false,
      inStock: inStock !== false,
    });
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: 'فشل في إضافة المنتج' });
  }
});

app.put('/api/products/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    if (req.body.name !== undefined && (typeof req.body.name !== 'string' || !req.body.name.trim())) {
      res.status(400).json({ error: 'اسم المنتج مطلوب.' });
      return;
    }
    if (req.body.categoryId !== undefined && !db.getCategoryById(String(req.body.categoryId))) {
      res.status(400).json({ error: 'القسم المحدد غير موجود.' });
      return;
    }
    if (req.body.variants !== undefined) {
      const variantsError = validateProductVariants(req.body.variants);
      if (variantsError) {
        res.status(400).json({ error: variantsError });
        return;
      }
    }
    const updated = db.updateProduct(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'المنتج غير موجود' });
      return;
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'فشل في تحديث المنتج' });
  }
});

app.delete('/api/products/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const success = db.deleteProduct(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'المنتج غير موجود' });
      return;
    }
    res.json({ success: true, message: 'تم حذف المنتج بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'فشل في حذف المنتج' });
  }
});

// ==========================================
// 4. Orders & WhatsApp Checkout API
// ==========================================
app.post('/api/orders', (req: Request, res: Response) => {
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
    const normalizedCustomerPhone = customerDetails.phone.replace(/[\s()-]/g, '');
    if (!/^\+?[0-9]{7,15}$/.test(normalizedCustomerPhone)) {
      res.status(400).json({ error: 'رقم هاتف العميل غير صحيح.' });
      return;
    }

    // This storefront uses one direct product request per checkout (no shopping cart).
    if (!Array.isArray(items) || items.length !== 1) {
      res.status(400).json({ error: 'يرجى اختيار منتج واحد لإتمام الطلب.' });
      return;
    }

    const requestedItem = items[0];
    if (!requestedItem?.productId || !requestedItem?.variantId) {
      res.status(400).json({ error: 'بيانات المنتج أو الحجم المختار غير مكتملة.' });
      return;
    }

    // Resolve product name, variant, image and price from the server database.
    // Never rely on a price or product name sent by the browser.
    const product = db.getProductById(String(requestedItem.productId));
    if (!product || !product.isActive || !product.inStock) {
      res.status(400).json({ error: 'هذا المنتج غير متوفر حاليًا. يرجى اختيار منتج آخر.' });
      return;
    }

    const variant = product.variants.find((entry: any) => entry.id === String(requestedItem.variantId));
    if (!variant || Number(variant.stock) <= 0) {
      res.status(400).json({ error: 'الحجم أو النوع المختار غير متوفر لهذا المنتج.' });
      return;
    }

    const quantity = Number(requestedItem.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > Math.min(99, Number(variant.stock))) {
      res.status(400).json({ error: 'الكمية المطلوبة أكبر من المخزون المتاح أو غير صحيحة.' });
      return;
    }

    // Calculate the single-product order from trusted database values.
    let itemsTotal: number | null = 0;
    let hasUnpricedItem = false;

    const price = typeof variant.price === 'number' ? variant.price : null;
    const itemSubtotal = price !== null ? price * quantity : null;
    if (itemSubtotal === null) {
      hasUnpricedItem = true;
      itemsTotal = null;
    } else {
      itemsTotal += itemSubtotal;
    }

    const formattedItems = [{
      productId: product.id,
      productName: product.name,
      variantId: variant.id,
      variantName: variant.name,
      quantity,
      unitPrice: price,
      totalPrice: itemSubtotal,
      image: product.images?.[0],
    }];

    if (hasUnpricedItem) {
      itemsTotal = null; // Some items require price consultation
    }

    // Delivery fees are read from store settings on the server, never trusted from the browser.
    const storeSettings = db.getSettings();
    const requestedCity = String(customerDetails.city).trim();
    const cityOption = storeSettings.cities.find((entry: any) => entry.city === requestedCity);
    const calculatedDeliveryFee =
      cityOption && typeof cityOption.fee === 'number' ? cityOption.fee : null;
    const finalTotal = itemsTotal !== null && calculatedDeliveryFee !== null ? itemsTotal + calculatedDeliveryFee : itemsTotal;

    // Compose formatted Arabic WhatsApp message
    const itemsListText = formattedItems.map((item, idx) => {
      const priceStr = item.unitPrice !== null ? `${item.unitPrice.toLocaleString('ar-YE')} ر.ي` : 'يحدد عبر واتساب';
      const totalStr = item.totalPrice !== null ? `${item.totalPrice.toLocaleString('ar-YE')} ر.ي` : 'يحدد عبر واتساب';
      return `${idx + 1}. *${item.productName}*\n   الحجم/النوع: ${item.variantName}\n   الكمية: ${item.quantity}\n   السعر: ${priceStr}\n   الإجمالي: ${totalStr}`;
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

    const orderNumberPlaceholder = `TLP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const whatsappMessage = `مرحبًا متجر توليب للعناية الطبيعية.

أرغب في تأكيد طلب جديد رقم: [${orderNumberPlaceholder}]

بيانات العميل:
${addressSection}

تفاصيل الطلب:
${itemsListText}

إجمالي المنتجات: ${itemsTotalStr}
رسوم التوصيل: ${deliveryFeeStr}
الإجمالي النهائي: ${finalTotalStr}

أرجو تأكيد توفر المنتجات وتحديد رسوم التوصيل وموعد التسليم وطريقة الدفع المناسبة.

شكرًا لكم.`;

    const savedOrder = db.createOrder({
      customerDetails,
      items: formattedItems,
      itemsTotal,
      deliveryFee: calculatedDeliveryFee,
      deliveryFeeNote: calculatedDeliveryFee === null ? 'تحدد رسوم التوصيل عبر واتساب' : undefined,
      finalTotal,
      status: 'awaiting_whatsapp_confirmation',
      whatsappMessage,
    });

    // Replace the placeholder with the actual generated order number and persist
    // the exact message that is sent to WhatsApp for the admin order record.
    const finalWhatsappMessage = whatsappMessage.replace(orderNumberPlaceholder, savedOrder.orderNumber);
    const orderWithMessage = db.updateOrderWhatsAppMessage(savedOrder.id, finalWhatsappMessage);
    if (!orderWithMessage) {
      throw new Error('Order was created but its WhatsApp message could not be saved.');
    }

    // Build the direct WhatsApp URL
    const targetPhone = String(storeSettings.whatsappPhone || '').replace(/\D/g, '');
    const fullPhone = targetPhone.startsWith('967') ? targetPhone : `967${targetPhone}`;
    if (!/^[0-9]{10,15}$/.test(fullPhone)) {
      res.status(503).json({ error: 'رقم واتساب المتجر غير مضبوط. يرجى التواصل مع صاحبة المتجر.' });
      return;
    }
    const encodedMsg = encodeURIComponent(finalWhatsappMessage);
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

app.get('/api/orders', requireAdmin, (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const orders = db.getOrders({
      status: status as any,
      search: search as string,
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'فشل في جلب الطلبات' });
  }
});

app.get('/api/orders/:id', requireAdmin, (req: Request, res: Response) => {
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

app.patch('/api/orders/:id/status', requireAdmin, (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ error: 'حالة الطلب مطلوبة' });
      return;
    }
    const updated = db.updateOrderStatus(req.params.id, status);
    if (!updated) {
      res.status(404).json({ error: 'الطلب غير موجود' });
      return;
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'فشل في تحديث حالة الطلب' });
  }
});

// ==========================================
// 5. Admin Authentication & Dashboard Stats
// ==========================================
app.post('/api/admin/login', (req: Request, res: Response) => {
  try {
    if (isLoginRateLimited(req)) {
      res.setHeader('Retry-After', '900');
      res.status(429).json({ error: 'تم تجاوز عدد محاولات تسجيل الدخول. حاول بعد 15 دقيقة.' });
      return;
    }

    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان بصيغة صحيحة' });
      return;
    }
    if (!email || !password) {
      res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
      return;
    }

    const isValid = db.verifyAdminCredentials(email.trim(), password);
    if (!isValid) {
      res.status(401).json({ error: 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد وكلمة المرور.' });
      return;
    }

    const admin = db.getAdminInfo();
    loginAttemptBuckets.delete(req.ip || req.socket.remoteAddress || 'unknown');
    const token = generateToken({ email: admin.email, id: admin.id, sessionVersion: db.getAdminSessionVersion() });

    res.json({
      success: true,
      token,
      user: admin,
    });
  } catch (err) {
    res.status(500).json({ error: 'فشل في تسجيل الدخول' });
  }
});

app.get('/api/admin/me', requireAdmin, (req: Request, res: Response) => {
  try {
    const admin = db.getAdminInfo();
    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: 'فشل في التحقق من المستخدم' });
  }
});

app.post('/api/admin/change-password', requireAdmin, (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      res.status(503).json({ error: 'في بيئة الإنتاج، يتم تغيير بيانات المسؤول من إعدادات الأسرار في منصة الاستضافة.' });
      return;
    }
    const { currentPassword, newEmail, newPassword } = req.body;
    const admin = db.getAdminInfo();

    // Verify current password first
    if (!db.verifyAdminCredentials(admin.email, currentPassword)) {
      res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة.' });
      return;
    }

    if (newPassword && newPassword.length < 6) {
      res.status(400).json({ error: 'كلمة المرور الجديدة يجب ألا تقل عن 6 خانات.' });
      return;
    }

    const updated = db.updateAdminCredentials(newEmail, newPassword);
    const newToken = generateToken({ email: updated.email, id: updated.id, sessionVersion: db.getAdminSessionVersion() });

    res.json({
      success: true,
      message: 'تم تحديث بيانات المسؤول بنجاح',
      user: updated,
      token: newToken,
    });
  } catch (err) {
    res.status(500).json({ error: 'فشل في تحديث بيانات الحساب' });
  }
});

app.get('/api/admin/stats', requireAdmin, (req: Request, res: Response) => {
  try {
    const stats = db.getAdminStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'فشل في استخراج إحصائيات المتجر' });
  }
});

// ==========================================
// 6. Image Upload API (Base64 file storage)
// ==========================================
app.post('/api/upload', requireAdmin, (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      res.status(503).json({ error: 'رفع الصور يحتاج إلى خدمة تخزين دائمة (Object Storage) قبل تفعيل الإنتاج.' });
      return;
    }
    const { base64Data, filename } = req.body;
    if (!base64Data) {
      res.status(400).json({ error: 'بيانات الصورة مفقودة' });
      return;
    }

    // Match data:image/png;base64,...
    const matches = base64Data.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      res.status(400).json({ error: 'صيغة الصورة غير صحيحة' });
      return;
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const safeName = `tulip_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeName);

    fs.writeFileSync(filePath, buffer);
    const publicUrl = `/uploads/${safeName}`;

    res.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'فشل في رفع الصورة' });
  }
});

// ==========================================
// 7. Vite Integration (SPA & Static Serving)
// ==========================================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌸 متجر توليب للعناية الطبيعية شغال على http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
