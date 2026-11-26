import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDeliveryOptionForGovernorate,
  YEMEN_GOVERNORATES,
} from '../src/utils/yemen-governorates.ts';

test('the checkout selector contains all 21 governorates plus Amanat Al Asimah', () => {
  assert.equal(YEMEN_GOVERNORATES.length, 22);
  assert.equal(new Set(YEMEN_GOVERNORATES).size, 22);

  for (const name of [
    'أمانة العاصمة', 'أبين', 'إب', 'البيضاء', 'الحديدة', 'الجوف',
    'الضالع', 'المحويت', 'المهرة', 'تعز', 'ذمار', 'عدن', 'عمران',
    'حضرموت', 'حجة', 'لحج', 'مأرب', 'ريمة', 'شبوة', 'صعدة',
    'محافظة صنعاء', 'سقطرى',
  ]) {
    assert.ok(YEMEN_GOVERNORATES.includes(name as never), 'missing ' + name);
  }
});

test('Amanat Al Asimah keeps the existing Sanaa city fee without applying it to Sanaa governorate', () => {
  const cities = [
    { city: 'صنعاء', fee: 2000, estimatedDays: 'خلال 24-48 ساعة' },
    { city: 'عدن', fee: 3500, estimatedDays: 'خلال 2-3 أيام' },
  ];

  assert.equal(getDeliveryOptionForGovernorate(cities, 'أمانة العاصمة')?.fee, 2000);
  assert.equal(getDeliveryOptionForGovernorate(cities, 'محافظة صنعاء'), undefined);
  assert.equal(getDeliveryOptionForGovernorate(cities, 'عدن')?.fee, 3500);
});

test('newly added governorates without configured delivery charges remain WhatsApp-priced', () => {
  const cities = [
    { city: 'صنعاء', fee: 2000, estimatedDays: 'خلال 24-48 ساعة' },
    { city: 'عدن', fee: 3500, estimatedDays: 'خلال 2-3 أيام' },
  ];

  assert.equal(getDeliveryOptionForGovernorate(cities, 'سقطرى'), undefined);
  assert.equal(getDeliveryOptionForGovernorate(cities, 'حضرموت'), undefined);
});
