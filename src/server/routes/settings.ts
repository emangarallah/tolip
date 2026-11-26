import { Router, type Request, type Response } from 'express';
import { db } from '../db.ts';
import { requireAdmin } from '../middleware/admin-auth.ts';

const router = Router();

// ==========================================
// 1. Store Settings API
// ==========================================
router.get('/api/settings', (req: Request, res: Response) => {
  try {
    const settings = db.getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'فشل في جلب إعدادات المتجر' });
  }
});

router.put('/api/settings', requireAdmin, (req: Request, res: Response) => {
  try {
    const updated = db.updateSettings(req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'فشل في تحديث إعدادات المتجر' });
  }
});

export default router;
