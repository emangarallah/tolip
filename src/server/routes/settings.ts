import { Router, type Request, type Response } from 'express';
import { db } from '../db.ts';
import { requireAdmin } from '../middleware/admin-auth.ts';
import { isSafeAssetReference } from '../validation/product.ts';

const router = Router();

const SETTINGS_TEXT_LIMITS: Record<string, number> = {
  storeName: 120,
  storeTagline: 240,
  storeDescription: 3000,
  whatsappPhone: 32,
  heroHeadline: 180,
  heroSubtext: 1000,
  deliveryFeeGeneralNote: 500,
  deliveryPolicy: 5000,
  returnPolicy: 5000,
  privacyPolicy: 5000,
  aboutUsText: 5000,
};

function parseSettingsPayload(body: any): { value?: Record<string, any>; error?: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'بيانات الإعدادات غير صحيحة.' };
  const allowed = new Set([
    ...Object.keys(SETTINGS_TEXT_LIMITS),
    'logoUrl', 'whatsappOfficialLink', 'facebookUrl', 'instagramUrl', 'heroImage', 'cities',
  ]);
  if (Object.keys(body).some((key) => !allowed.has(key))) return { error: 'تحتوي الإعدادات على حقول غير مسموح بها.' };

  const value: Record<string, any> = {};
  for (const [field, maxLength] of Object.entries(SETTINGS_TEXT_LIMITS)) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== 'string' || body[field].length > maxLength) return { error: 'أحد حقول الإعدادات النصية غير صحيح.' };
    value[field] = body[field].trim();
  }

  for (const field of ['logoUrl', 'heroImage']) {
    if (body[field] === undefined) continue;
    if (!isSafeAssetReference(body[field])) return { error: 'رابط صورة الإعدادات غير صحيح.' };
    value[field] = body[field];
  }

  for (const field of ['whatsappOfficialLink', 'facebookUrl', 'instagramUrl']) {
    if (body[field] === undefined) continue;
    const url = body[field];
    if (typeof url !== 'string' || url.length > 2048) return { error: 'أحد روابط الإعدادات غير صحيح.' };
    if (url) {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return { error: 'أحد روابط الإعدادات غير صحيح.' };
      } catch {
        return { error: 'أحد روابط الإعدادات غير صحيح.' };
      }
    }
    value[field] = url.trim();
  }

  if (body.whatsappPhone !== undefined && !/^\+?[0-9\s()-]{7,32}$/.test(body.whatsappPhone)) {
    return { error: 'رقم واتساب المتجر غير صحيح.' };
  }

  if (body.cities !== undefined) {
    if (!Array.isArray(body.cities) || body.cities.length > 100) return { error: 'قائمة مناطق التوصيل غير صحيحة.' };
    const cityNames = new Set<string>();
    const cities = [];
    for (const city of body.cities) {
      if (!city || typeof city !== 'object' || Array.isArray(city) ||
          typeof city.city !== 'string' || !city.city.trim() || city.city.length > 80 ||
          typeof city.estimatedDays !== 'string' || city.estimatedDays.length > 80 ||
          !(city.fee === null || (typeof city.fee === 'number' && Number.isSafeInteger(city.fee) && city.fee >= 0 && city.fee <= 100_000_000))) {
        return { error: 'بيانات إحدى مناطق التوصيل غير صحيحة.' };
      }
      const name = city.city.trim();
      if (cityNames.has(name)) return { error: 'لا يمكن تكرار اسم المدينة في إعدادات التوصيل.' };
      cityNames.add(name);
      cities.push({ city: name, fee: city.fee, estimatedDays: city.estimatedDays.trim() });
    }
    value.cities = cities;
  }

  if (Object.keys(value).length === 0) return { error: 'لا توجد إعدادات صالحة لحفظها.' };
  return { value };
}

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
    const parsed = parseSettingsPayload(req.body);
    if (parsed.error || !parsed.value) {
      res.status(400).json({ error: parsed.error || 'بيانات الإعدادات غير صحيحة.' });
      return;
    }
    const updated = db.updateSettings(parsed.value);
    res.json(updated);
  } catch (err) {
    console.error('Settings update failed:', err);
    res.status(500).json({ error: 'فشل في تحديث إعدادات المتجر' });
  }
});

export default router;
