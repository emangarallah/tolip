import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { db } from '../db.ts';
import { getAdminPayload, requireAdmin } from '../middleware/admin-auth.ts';
import { validateProductVariants } from '../validation/product.ts';

const router = Router();

// ==========================================
// 3. Products API
// ==========================================
router.get('/api/products', (req: Request, res: Response) => {
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
    const slug = typeof req.body.slug === 'string' && req.body.slug.trim() ? req.body.slug.trim().toLowerCase() : 'product-' + crypto.randomUUID();
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

router.put('/api/products/:id', requireAdmin, (req: Request, res: Response) => {
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

router.delete('/api/products/:id', requireAdmin, (req: Request, res: Response) => {
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

export default router;
