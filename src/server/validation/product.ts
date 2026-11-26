export function validateProductVariants(variants: any): string | null {
  if (!Array.isArray(variants) || variants.length < 1 || variants.length > 50) {
    return 'يجب إضافة حجم أو نوع واحد على الأقل للمنتج.';
  }
  const ids = new Set<string>();
  for (const variant of variants) {
    if (!variant || typeof variant.id !== 'string' || !variant.id.trim()) return 'معرّف الحجم أو النوع غير صحيح.';
    if (ids.has(variant.id)) return 'لا يمكن تكرار معرّف الحجم أو النوع.';
    ids.add(variant.id);
    if (typeof variant.name !== 'string' || !variant.name.trim()) return 'اسم الحجم أو النوع مطلوب.';
    if (!Number.isInteger(variant.stock) || variant.stock < 0) return 'المخزون يجب أن يكون عددًا صحيحًا لا يقل عن صفر.';
    if (variant.price !== null && variant.price !== undefined && (!Number.isFinite(variant.price) || variant.price < 0)) {
      return 'سعر المنتج يجب أن يكون رقمًا موجبًا أو يترك فارغًا للاتفاق عبر واتساب.';
    }
    if (variant.originalPrice !== null && variant.originalPrice !== undefined &&
        (!Number.isFinite(variant.originalPrice) || variant.originalPrice < 0)) {
      return 'السعر السابق غير صحيح.';
    }
  }
  return null;
}
