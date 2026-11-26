import { db } from '../db.ts';
import { isSafeAssetReference } from '../validation/product.ts';

// Offer rules shared by the HTTP routes and order checkout.
export const offerIsCurrentlyActive = (offer: any) => {
  const now = Date.now();
  const start = offer.startsAt ? Date.parse(offer.startsAt) : NaN;
  const end = offer.endsAt ? Date.parse(offer.endsAt) : NaN;
  return offer.isActive === true && (!Number.isFinite(start) || start <= now) && (!Number.isFinite(end) || end >= now);
};

export function validateOfferInput(body: any): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'بيانات العرض غير صحيحة.';
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 120) return 'عنوان العرض مطلوب ويجب ألا يتجاوز 120 حرفًا.';
  if (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 3000)) return 'وصف العرض غير صحيح.';
  if (body.image !== undefined && !isSafeAssetReference(body.image)) return 'صورة العرض غير صحيحة.';
  if (!['percentage', 'fixed', 'bundle', 'buy_get'].includes(body.type)) return 'نوع العرض غير صحيح.';
  if (!Array.isArray(body.productIds) || body.productIds.length < 1 || body.productIds.length > 50) return 'يجب اختيار منتج واحد على الأقل وبحد أقصى 50 منتجًا.';
  if (body.productIds.some((id: any) => typeof id !== 'string' || id.length > 128 || !db.getProductById(id))) return 'أحد المنتجات المختارة غير موجود.';
  if (new Set(body.productIds).size !== body.productIds.length) return 'لا يمكن تكرار المنتج في العرض.';
  const numericValue = Number(body.value);
  if (body.value === '' || body.value === null || body.value === undefined || !Number.isFinite(numericValue) || numericValue < 0 || numericValue > 1_000_000_000) {
    return 'قيمة العرض غير صحيحة.';
  }
  if (body.type === 'percentage' && numericValue > 100) return 'نسبة الخصم لا يمكن أن تتجاوز 100%.';
  if (body.type === 'bundle') {
    const bundlePrice = Number(body.bundlePrice);
    if (body.bundlePrice === '' || !Number.isFinite(bundlePrice) || bundlePrice < 0 || bundlePrice > 1_000_000_000) return 'سعر الحزمة غير صحيح.';
  }
  for (const field of ['buyQuantity', 'getQuantity']) {
    if (body[field] !== undefined && (!Number.isSafeInteger(Number(body[field])) || Number(body[field]) < 1 || Number(body[field]) > 99)) {
      return 'كميات عرض الحزمة غير صحيحة.';
    }
  }
  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') return 'حالة العرض غير صحيحة.';
  for (const field of ['startsAt', 'endsAt']) {
    const value = body[field];
    if (value !== undefined && value !== null &&
        (typeof value !== 'string' || value.length > 64 || !Number.isFinite(Date.parse(value)))) {
      return field === 'startsAt' ? 'تاريخ بداية العرض غير صحيح.' : 'تاريخ نهاية العرض غير صحيح.';
    }
  }
  if (body.startsAt && body.endsAt && Date.parse(body.endsAt) <= Date.parse(body.startsAt)) return 'يجب أن يكون تاريخ الانتهاء بعد تاريخ البداية.';
  const allowed = new Set(['id', 'title', 'description', 'image', 'type', 'productIds', 'value', 'bundlePrice', 'buyQuantity', 'getQuantity', 'startsAt', 'endsAt', 'isActive', 'createdAt', 'updatedAt']);
  if (Object.keys(body).some((key) => !allowed.has(key))) return 'تحتوي بيانات العرض على حقول غير مسموح بها.';
  return null;
}
