import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { db } from '../db.ts';
import { getAdminPayload, requireAdmin } from '../middleware/admin-auth.ts';
import { isSafeAssetReference } from '../validation/product.ts';

const router = Router();

function parseCategoryWritePayload(body: any, partial: boolean): { value?: Record<string, any>; error?: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'بيانات القسم غير صحيحة.' };
  const value: Record<string, any> = {};

  if (body.name !== undefined || !partial) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 120) {
      return { error: 'اسم القسم مطلوب ويجب ألا يتجاوز 120 حرفًا.' };
    }
    value.name = body.name.trim();
  }

  if (body.slug !== undefined && typeof body.slug !== 'string') {
    return { error: 'رابط القسم المختصر غير صحيح.' };
  }

  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
  if (slug) {
    if (body.slug!.length > 160 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return { error: 'رابط القسم المختصر غير صحيح.' };
    }
    value.slug = slug;
  } else if (!partial) {
    // The admin form does not expose a slug field; generate one when it sends an empty value.
    value.slug = 'category-' + crypto.randomUUID();
  }

  if (body.description !== undefined || !partial) {
    if (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 3000)) {
      return { error: 'وصف القسم غير صحيح.' };
    }
    value.description = typeof body.description === 'string' ? body.description.trim() : '';
  }

  if (body.image !== undefined || !partial) {
    if (body.image !== undefined && !isSafeAssetReference(body.image)) return { error: 'صورة القسم غير صحيحة.' };
    value.image = typeof body.image === 'string'
      ? body.image
      : '/src/assets/images/product_skincare_cream_1795590418002.jpg';
  }

  if (body.sortOrder !== undefined || !partial) {
    const order = body.sortOrder === undefined ? 1 : body.sortOrder;
    if (!Number.isSafeInteger(order) || order < 0 || order > 10000) return { error: 'ترتيب القسم غير صحيح.' };
    value.sortOrder = order;
  }

  if (body.isActive !== undefined || !partial) {
    if (body.isActive !== undefined && typeof body.isActive !== 'boolean') return { error: 'حالة القسم غير صحيحة.' };
    value.isActive = body.isActive === undefined ? true : body.isActive;
  }

  return { value };
}

// ==========================================
// 2. Categories API
// ==========================================
router.get('/api/categories', async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === 'true' && Boolean(getAdminPayload(req));
    const categories = await db.getCategoriesWithCounts(includeInactive);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'فشل في جلب الأقسام' });
  }
});

router.post('/api/categories', requireAdmin, (req: Request, res: Response) => {
  try {
    const parsed = parseCategoryWritePayload(req.body, false);
    if (parsed.error || !parsed.value) {
      res.status(400).json({ error: parsed.error || 'بيانات القسم غير صحيحة.' });
      return;
    }
    const created = db.createCategory(parsed.value as any);
    res.status(201).json(created);
  } catch (err) {
    console.error('Category creation failed:', err);
    res.status(500).json({ error: 'فشل في إنشاء القسم' });
  }
});

router.put('/api/categories/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const parsed = parseCategoryWritePayload(req.body, true);
    if (parsed.error || !parsed.value || Object.keys(parsed.value).length === 0) {
      res.status(400).json({ error: parsed.error || 'لا توجد تغييرات صالحة لحفظها.' });
      return;
    }
    const updated = db.updateCategory(req.params.id, parsed.value);
    if (!updated) {
      res.status(404).json({ error: 'القسم غير موجود' });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error('Category update failed:', err);
    res.status(500).json({ error: 'فشل في تحديث القسم' });
  }
});

router.delete('/api/categories/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const success = await db.deleteCategoryFromStore(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'القسم غير موجود' });
      return;
    }
    res.json({ success: true, message: 'تم حذف القسم بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'فشل في حذف القسم' });
  }
});

export default router;
