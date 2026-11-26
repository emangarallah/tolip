const MAX_PRICE = 1_000_000_000;
const MAX_STOCK = 100_000;

export function validateProductVariants(variants: any): string | null {
  if (!Array.isArray(variants) || variants.length < 1 || variants.length > 50) {
    return 'يجب إضافة حجم أو نوع واحد على الأقل للمنتج.';
  }

  const ids = new Set<string>();
  for (const variant of variants) {
    if (!variant || typeof variant !== 'object' || Array.isArray(variant)) return 'بيانات الحجم أو النوع غير صحيحة.';
    if (typeof variant.id !== 'string' || !variant.id.trim() || variant.id.length > 128) {
      return 'معرّف الحجم أو النوع غير صحيح.';
    }
    if (ids.has(variant.id)) return 'لا يمكن تكرار معرّف الحجم أو النوع.';
    ids.add(variant.id);

    if (typeof variant.name !== 'string' || !variant.name.trim() || variant.name.length > 120) {
      return 'اسم الحجم أو النوع مطلوب ويجب ألا يتجاوز 120 حرفًا.';
    }
    if (!Number.isSafeInteger(variant.stock) || variant.stock < 0 || variant.stock > MAX_STOCK) {
      return 'المخزون يجب أن يكون عددًا صحيحًا بين صفر و100000.';
    }
    if (variant.price !== null && variant.price !== undefined &&
        (typeof variant.price !== 'number' || !Number.isFinite(variant.price) || variant.price < 0 || variant.price > MAX_PRICE)) {
      return 'سعر المنتج غير صحيح.';
    }
    if (variant.originalPrice !== null && variant.originalPrice !== undefined &&
        (typeof variant.originalPrice !== 'number' || !Number.isFinite(variant.originalPrice) || variant.originalPrice < 0 || variant.originalPrice > MAX_PRICE)) {
      return 'السعر السابق غير صحيح.';
    }
    if (variant.sku !== undefined && variant.sku !== null &&
        (typeof variant.sku !== 'string' || variant.sku.length > 80)) {
      return 'رمز المنتج غير صحيح.';
    }
    const allowedKeys = new Set(['id', 'name', 'price', 'originalPrice', 'stock', 'sku']);
    if (Object.keys(variant).some((key) => !allowedKeys.has(key))) {
      return 'تحتوي بيانات الحجم أو النوع على حقول غير مسموح بها.';
    }
  }
  return null;
}

export function isSafeAssetReference(value: unknown, maxLength = 2048): value is string {
  if (typeof value !== 'string' || value.length > maxLength) return false;
  if (!value) return true;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
