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

router.delete('/api/offers/:id', requireAdmin, (req: Request, res: Response) => {
  if (!db.deleteOffer(req.params.id)) { res.status(404).json({ error: 'العرض غير موجود.' }); return; }
  res.json({ success: true });
});

export default router;
