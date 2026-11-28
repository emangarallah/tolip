import type { ProductVariant } from '../types/store.ts';

export interface RegionalPrice {
  label: 'ري' | 'ري ج' | 'رس';
  value: number;
}

/**
 * Returns only the regional prices that are actually stored for a product variant.
 * No currency conversion or fallback price is applied.
 */
export function getRegionalPrices(variant?: ProductVariant | null): RegionalPrice[] {
  if (!variant) return [];

  const candidates: Array<{ label: RegionalPrice['label']; value: number | null | undefined }> = [
    { label: 'ري', value: variant.priceYerNorth },
    { label: 'ري ج', value: variant.priceYerSouth },
    { label: 'رس', value: variant.priceSar },
  ];

  return candidates.filter(
    (entry): entry is RegionalPrice =>
      typeof entry.value === 'number' && Number.isFinite(entry.value)
  );
}
