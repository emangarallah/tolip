import type { CityDeliveryOption } from '../types/store.ts';

/**
 * Yemen's 21 governorates plus Amanat Al Asimah (the capital municipality).
 * City-level delivery charges remain configured by the store team and are
 * intentionally not displayed in the customer-facing governorate selector.
 */
export const YEMEN_GOVERNORATES = [
  'أمانة العاصمة',
  'أبين',
  'إب',
  'البيضاء',
  'الحديدة',
  'الجوف',
  'الضالع',
  'المحويت',
  'المهرة',
  'تعز',
  'ذمار',
  'عدن',
  'عمران',
  'حضرموت',
  'حجة',
  'لحج',
  'مأرب',
  'ريمة',
  'شبوة',
  'صعدة',
  'محافظة صنعاء',
  'سقطرى',
] as const;

// The old settings record "صنعاء" represented the capital city. Preserve its
// configured fee for Amanat Al Asimah, without applying it to Sana'a governorate.
const LEGACY_DELIVERY_CITY_BY_GOVERNORATE: Partial<Record<(typeof YEMEN_GOVERNORATES)[number], string>> = {
  'أمانة العاصمة': 'صنعاء',
};

export function getDeliveryOptionForGovernorate(
  cities: readonly CityDeliveryOption[],
  governorate: string
): CityDeliveryOption | undefined {
  const configuredName = LEGACY_DELIVERY_CITY_BY_GOVERNORATE[
    governorate as (typeof YEMEN_GOVERNORATES)[number]
  ] ?? governorate;

  return cities.find((option) => option.city === configuredName);
}
