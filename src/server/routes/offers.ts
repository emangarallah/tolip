import { Router, type Request, type Response } from 'express';
import { db } from '../db.ts';
import { getAdminPayload, requireAdmin } from '../middleware/admin-auth.ts';
import { offerIsCurrentlyActive, validateOfferInput } from '../services/offers.ts';

const router = Router();

// ==========================================
// 2.5. Offers / Promotions API
// ==========================================


router.get('/api/offers', (req: Request, res: Response) => {
  try {
    const requestsInactive = req.query.includeInactive === 'true';
    const includeInactive = requestsInactive && Boolean(getAdminPayload(req));
    const offers = db.getOffers(includeInactive);
    res.setHeader(
      'Cache-Control',
      requestsInactive
        ? 'no-store'
        : 'public, max-age=0, s-maxage=10, stale-while-revalidate=20'
    );
    res.json(offers.filter((offer: any) => includeInactive || offerIsCurrentlyActive(offer)));
  } catch { res.status(500).json({ error: 'تعذر جلب العروض' }); }
});



router.post('/api/offers', requireAdmin, (req: Request, res: Response) => {
  const error = validateOfferInput(req.body);
  if (error) { res.status(400).json({ error }); return; }
  const offer = db.createOffer({
    title: req.body.title.trim(), description: typeof req.body.description === 'string' ? req.body.description.trim() : '',
    image: typeof req.body.image === 'string' ? req.body.image.trim() : '', type: req.body.type,
    productIds: Array.from(new Set<string>(req.body.productIds as string[])), value: Number(req.body.value),
    bundlePrice: req.body.bundlePrice === '' || req.body.bundlePrice == null ? null : Number(req.body.bundlePrice),
    buyQuantity: Math.max(1, Math.floor(Number(req.body.buyQuantity) || 1)),
    getQuantity: Math.max(1, Math.floor(Number(req.body.getQuantity) || 1)),
    startsAt: req.body.startsAt || null, endsAt: req.body.endsAt || null, isActive: req.body.isActive !== false,
  });
  res.status(201).json(offer);
});

router.put('/api/offers/:id', requireAdmin, (req: Request, res: Response) => {
  const error = validateOfferInput(req.body);
  if (error) { res.status(400).json({ error }); return; }
  const updated = db.updateOffer(req.params.id, {
    title: req.body.title.trim(), description: typeof req.body.description === 'string' ? req.body.description.trim() : '',
    image: typeof req.body.image === 'string' ? req.body.image.trim() : '', type: req.body.type,
    productIds: Array.from(new Set<string>(req.body.productIds as string[])), value: Number(req.body.value),
    bundlePrice: req.body.bundlePrice === '' || req.body.bundlePrice == null ? null : Number(req.body.bundlePrice),
    buyQuantity: Math.max(1, Math.floor(Number(req.body.buyQuantity) || 1)),
    getQuantity: Math.max(1, Math.floor(Number(req.body.getQuantity) || 1)),
    startsAt: req.body.startsAt || null, endsAt: req.body.endsAt || null, isActive: req.body.isActive !== false,
  });
  if (!updated) { res.status(404).json({ error: 'العرض غير موجود.' }); return; }
  res.json(updated);
});

const deleteOfferHandler = async (req: Request, res: Response) => {
  try {
    const offerId = typeof req.params.id === 'string' && req.params.id
      ? req.params.id
      : typeof req.body?.id === 'string'
        ? req.body.id.trim()
        : '';
    if (!offerId) {
      res.status(400).json({ success: false, error: 'معرّف العرض غير صالح.' });
      return;
    }
    // Reassert the verified admin role in this transaction before SQL writes.
    await db.authorizeAuthenticatedAdmin();
    const deleted = await db.deleteOffer(offerId);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'العرض غير موجود أو تم حذفه مسبقًا.' });
      return;
    }
    res.status(200).json({ success: true, id: offerId });
  } catch (error) {
    console.error('Failed to delete offer:', error);
    res.status(500).json({
      success: false,
      error: 'تعذر حذف العرض من قاعدة البيانات. أعيدي المحاولة، وإذا استمرت المشكلة تواصلي مع الدعم.',
    });
  }
};

// Keep DELETE for standard REST clients and expose a POST action as a
// reliable fallback for hosting layers or proxies that restrict DELETE methods.
router.delete('/api/offers/:id', requireAdmin, deleteOfferHandler);
router.post('/api/offers/:id/delete', requireAdmin, deleteOfferHandler);
// Use a fixed endpoint for the admin UI to avoid catch-all serverless routing
// interpreting a nested action path as a missing API route.
router.post('/api/offers/delete', requireAdmin, deleteOfferHandler);

export default router;
