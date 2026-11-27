import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { db } from '../db.ts';
import { getAdminPayload, requireAdmin } from '../middleware/admin-auth.ts';
import { isSafeAssetReference, validateProductVariants } from '../validation/product.ts';
import { hasPaginationQuery, parsePaginationQuery } from '../pagination.ts';

const router = Router();

function parseProductWritePayload(body: any, partial: boolean): { value?: Record<string, any>; error?: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'بيانات المنتج غير صحيحة.' };
  const value: Record<string, any> = {};

  const textFields: Record<string, number> = {
    name: 160,
    slug: 180,
    description: 5000,
    usageInstructions: 3000,
  };
  for (const [field, maxLength] of Object.entries(textFields)) {
    if (body[field] === undefined) {
      if (!partial && field === 'name') return { error: 'اسم المنتج مطلوب ويجب ألا يتجاوز 160 حرفًا.' };
      continue;
    }
    if (typeof body[field] !== 'string' || body[field].length > maxLength || (!partial && field === 'name' && !body[field].trim())) {
      return { error: field === 'name' ? 'اسم المنتج مطلوب ويجب ألا يتجاوز 160 حرفًا.' : 'أحد حقول المنتج النصية غير صحيح.' };
    }
    if (field === 'name' || field === 'description' || field === 'usageInstructions') value[field] = body[field].trim();
    if (field === 'slug') {
      const slug = body[field].trim().toLowerCase();
      if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { error: 'رابط المنتج المختصر غير صحيح.' };
      if (slug) value.slug = slug;
    }
  }

  if (body.categoryId !== undefined || !partial) {
    if (typeof body.categoryId !== 'string' || body.categoryId.length > 128 || !db.getCategoryById(body.categoryId)) {
      return { error: 'يجب اختيار قسم موجود للمنتج.' };
    }
    value.categoryId = body.categoryId;
  }

  if (body.features !== undefined || !partial) {
    if (body.features !== undefined && (!Array.isArray(body.features) || body.features.length > 20 ||
      body.features.some((item: unknown) => typeof item !== 'string' || item.length > 160))) {
      return { error: 'قائمة مميزات المنتج غير صحيحة.' };
    }
    value.features = Array.isArray(body.features) ? body.features.map((item: string) => item.trim()) : [];
  }

  if (body.images !== undefined || !partial) {
    if (body.images !== undefined && (!Array.isArray(body.images) || body.images.length > 12 ||
      body.images.some((item: unknown) => !isSafeAssetReference(item)))) {
      return { error: 'صور المنتج غير صحيحة.' };
    }
    value.images = Array.isArray(body.images) && body.images.length
      ? body.images
      : ['/src/assets/images/product_skincare_cream_1795590418002.jpg'];
  }

  if (body.variants !== undefined || !partial) {
    const variants = body.variants === undefined || (Array.isArray(body.variants) && body.variants.length === 0)
      ? [{ id: `v-${crypto.randomUUID()}`, name: 'حجم قياسي', price: null, stock: 10 }]
      : body.variants;
    const variantsError = validateProductVariants(variants);
    if (variantsError) return { error: variantsError };
    value.variants = variants.map((variant: any) => ({
      id: variant.id.trim(),
      name: variant.name.trim(),
      price: variant.price ?? null,
      originalPrice: variant.originalPrice ?? null,
      stock: variant.stock,
      ...(typeof variant.sku === 'string' && variant.sku ? { sku: variant.sku.trim() } : {}),
    }));
  }

  for (const field of ['isFeatured', 'isBestSeller', 'inStock', 'isActive']) {
    if (body[field] === undefined && partial) continue;
    if (body[field] !== undefined && typeof body[field] !== 'boolean') {
      return { error: 'إعدادات ظهور المنتج غير صحيحة.' };
    }
    if (body[field] !== undefined) value[field] = body[field];
    else if (!partial) value[field] = field === 'isFeatured' || field === 'isBestSeller' ? false : true;
  }

  return { value };
}

// ==========================================
// 3. Products API
// ==========================================
router.get('/api/products', async (req: Request, res: Response) => {
  try {
    const { categoryId, search, isFeatured, isBestSeller, inStockOnly, includeInactive, sortBy } = req.query;
    const requestsInactive = includeInactive === 'true';
    const options = {
      categoryId: categoryId as string,
      search: search as string,
      isFeatured: isFeatured === 'true',
      isBestSeller: isBestSeller === 'true',
      inStockOnly: inStockOnly === 'true',
      includeInactive: requestsInactive && Boolean(getAdminPayload(req)),
      sortBy: sortBy as 'price-asc' | 'price-desc' | 'newest' | 'name',
    };
    const cacheControl = requestsInactive
      ? 'no-store'
      : 'public, max-age=0, s-maxage=10, stale-while-revalidate=20';

    if (hasPaginationQuery(req.query as Record<string, unknown>)) {
      const parsed = parsePaginationQuery(req.query as Record<string, unknown>);
      if (!parsed.ok) {
        res.status(400).json({ error: parsed.error });
        return;
      }
      const result = await db.getProductsPage(options, parsed.value.page, parsed.value.pageSize);
      res.setHeader('Cache-Control', cacheControl);
      res.json(result);
      return;
    }

    res.setHeader('Cache-Control', cacheControl);
    res.json(db.getProducts(options));
  } catch (err) {
    console.error('Products query failed:', err);
    res.status(500).json({ error: 'فشل في جلب المنتجات' });
  }
});
router.get('/api/products/:id', (req: Request, res: Response) => {
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

router.post('/api/products', requireAdmin, (req: Request, res: Response) => {
  try {
    const parsed = parseProductWritePayload(req.body, false);
    if (parsed.error || !parsed.value) {
      res.status(400).json({ error: parsed.error || 'بيانات المنتج غير صحيحة.' });
      return;
    }
    const value = parsed.value;
    const slug = value.slug || 'product-' + crypto.randomUUID();
    const newProduct = db.createProduct({
      name: value.name,
      slug,
      categoryId: value.categoryId,
      description: value.description || '',
      features: value.features || [],
      usageInstructions: value.usageInstructions || '',
      images: value.images || ['/src/assets/images/product_skincare_cream_1795590418002.jpg'],
      // Variant IDs are server-owned on create. This prevents collisions when
      // a browser retries or submits the same unsaved form more than once.
      variants: value.variants.map((variant: any) => ({
        ...variant,
        id: `variant-${crypto.randomUUID()}`,
      })),
      isFeatured: value.isFeatured ?? false,
      isBestSeller: value.isBestSeller ?? false,
      isActive: value.isActive ?? true,
      inStock: value.inStock ?? true,
    });
    res.status(201).json(newProduct);
  } catch (err) {
    console.error('Product creation failed:', err);
    res.status(500).json({ error: 'فشل في إضافة المنتج' });
  }
});

router.put('/api/products/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const parsed = parseProductWritePayload(req.body, true);
    if (parsed.error || !parsed.value || Object.keys(parsed.value).length === 0) {
      res.status(400).json({ error: parsed.error || 'لا توجد تغييرات صالحة لحفظها.' });
      return;
    }
    const updated = db.updateProduct(req.params.id, parsed.value);
    if (!updated) {
      res.status(404).json({ error: 'المنتج غير موجود' });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error('Product update failed:', err);
    res.status(500).json({ error: 'فشل في تحديث المنتج' });
  }
});

router.delete('/api/products/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const success = await db.deleteProductFromStore(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'المنتج غير موجود' });
      return;
    }
    res.json({ success: true, message: 'تم حذف المنتج بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'فشل في حذف المنتج' });
  }
});

export default router;
