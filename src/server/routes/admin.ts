import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, generateToken } from '../db.ts';
import { clearLoginAttempts, isLoginRateLimited, requireAdmin } from '../middleware/admin-auth.ts';

const router = Router();

// ==========================================
// 5. Admin Authentication & Dashboard Stats
// ==========================================
router.use('/api/admin', (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  next();
});

router.post('/api/admin/login', async (req: Request, res: Response) => {
  try {
    if (await isLoginRateLimited(req)) {
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

    let isValid = db.verifyAdminCredentials(email.trim(), password);
    if (!isValid && db.matchesAdminBootstrapCredentials(email.trim(), password)) {
      isValid = await db.completeAdminBootstrap(email.trim(), password) &&
        db.verifyAdminCredentials(email.trim(), password);
    }
    if (!isValid) {
      res.status(401).json({ error: 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد وكلمة المرور.' });
      return;
    }
    // Disable deployment-secret bootstrap once the owner has authenticated successfully.
    db.markAdminBootstrapCompleted();

    const admin = db.getAdminInfo();
    await clearLoginAttempts(req);
    const sessionVersion = db.rotateAdminSession();
    const token = generateToken({ email: admin.email, id: admin.id, sessionVersion, role: 'admin' });

    res.json({
      success: true,
      token,
      user: admin,
    });
  } catch (err) {
    res.status(500).json({ error: 'فشل في تسجيل الدخول' });
  }
});

router.get('/api/admin/me', requireAdmin, (req: Request, res: Response) => {
  try {
    const admin = db.getAdminInfo();
    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: 'فشل في التحقق من المستخدم' });
  }
});

router.post('/api/admin/logout', requireAdmin, (req: Request, res: Response) => {
  try {
    db.rotateAdminSession();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'تعذر إنهاء جلسة المسؤول' });
  }
});

router.post('/api/admin/change-password', requireAdmin, (req: Request, res: Response) => {
  try {
    const { currentPassword, newEmail, newPassword } = req.body;
    const admin = db.getAdminInfo();

    // Verify current password first
    if (!db.verifyAdminCredentials(admin.email, currentPassword)) {
      res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة.' });
      return;
    }

    if (newPassword && newPassword.length < 12) {
      res.status(400).json({ error: 'كلمة المرور الجديدة يجب ألا تقل عن 12 حرفًا.' });
      return;
    }

    const updated = db.updateAdminCredentials(newEmail, newPassword);
    const newToken = generateToken({ email: updated.email, id: updated.id, sessionVersion: db.getAdminSessionVersion(), role: 'admin' });

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

router.get('/api/admin/stats', requireAdmin, (req: Request, res: Response) => {
  try {
    const stats = db.getAdminStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'فشل في استخراج إحصائيات المتجر' });
  }
});

export default router;
