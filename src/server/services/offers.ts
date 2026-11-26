import { db } from '../db.ts';

// Offer rules shared by the HTTP routes and order checkout.
export const offerIsCurrentlyActive = (offer: any) => {
  const now = Date.now();
  const start = offer.startsAt ? Date.parse(offer.startsAt) : NaN;
  const end = offer.endsAt ? Date.parse(offer.endsAt) : NaN;
  return offer.isActive === true && (!Number.isFinite(start) || start <= now) && (!Number.isFinite(end) || end >= now);
};

export function validateOfferInput(body: any): string | null {
  if (typeof body.title !== 'string' || !body.title.trim()) return 'اسم العرض مطلوب.';
  if (!['percentage', 'fixed', 'bundle', 'buy_get'].includes(body.type)) return 'نوع العرض غير صحيح.';
  if (!Array.isArray(body.productIds) || body.productIds.length < 1) return 'يرجى اختيار منتج واحد على الأقل.';
  if (body.productIds.some((id: any) => typeof id !== 'string' || !db.getProductById(id))) return 'أحد المنتجات المختارة غير موجود.';
  if (!Number.isFinite(Number(body.value)) || Number(body.value) < 0) return 'قيمة الخصم غير صحيحة.';
  if (body.type === 'percentage' && Number(body.value) > 100) return 'نسبة الخصم لا يمكن أن تتجاوز 100%.';
  if (body.type === 'bundle' && (!Number.isFinite(Number(body.bundlePrice)) || Number(body.bundlePrice) < 0)) return 'سعر الحزمة غير صحيح.';
  if (body.startsAt && !Number.isFinite(Date.parse(body.startsAt))) return 'تاريخ بداية العرض غير صحيح.';
  if (body.endsAt && !Number.isFinite(Date.parse(body.endsAt))) return 'تاريخ نهاية العرض غير صحيح.';
  if (body.startsAt && body.endsAt && Date.parse(body.endsAt) <= Date.parse(body.startsAt)) return 'يجب أن يكون تاريخ الانتهاء بعد تاريخ البداية.';
  return null;
}
