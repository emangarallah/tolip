import { Router, type Request, type Response } from 'express';
import { db } from '../db.ts';
import { getAdminPayload, requireAdmin } from '../middleware/admin-auth.ts';

const router = Router();

// ==========================================
// 2. Categories API
// ==========================================
router.get('/api/categories', (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === 'true' && Boolean(getAdminPayload(req));
    const categories = db.getCategories(includeInactive);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'فشل في جلب الأقسام' });
  }
});

router.post('/api/categories', requireAdmin, (req: Request, res: Response) => {
  try {
    const { name, description, image, sortOrder, isActive } = req.body;
    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'اسم القسم مطلوب' });
      return;
    }
    const slug = typeof req.body.slug === 'string' && req.body.slug.trim() ? req.body.slug.trim().toLowerCase() : 'category-' + crypto.randomUUID();
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

router.put('/api/categories/:id', requireAdmin, (req: Request, res: Response) => {
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

router.delete('/api/categories/:id', requireAdmin, (req: Request, res: Response) => {
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

// Offers are mounted as a dedicated route module.
router.use(offersRouter);

export default router;
