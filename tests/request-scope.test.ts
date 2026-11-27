import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getRequiredStoreDataSections } from '../src/server/request-scope.ts';

test('public catalog requests load only the data needed by their response', () => {
  assert.deepEqual([...getRequiredStoreDataSections('GET', '/api/products')].sort(), ['adminUser', 'categories', 'products'].sort());
  assert.deepEqual([...getRequiredStoreDataSections('GET', '/api/categories')].sort(), ['adminUser', 'categories'].sort());
  assert.deepEqual([...getRequiredStoreDataSections('GET', '/api/settings')].sort(), ['adminUser', 'settings'].sort());
  assert.deepEqual([...getRequiredStoreDataSections('GET', '/api/offers')].sort(), ['adminUser', 'offers'].sort());
});

test('category writes avoid loading the product catalog', () => {
  assert.deepEqual([...getRequiredStoreDataSections('POST', '/api/categories')].sort(), ['adminUser', 'categories'].sort());
  assert.deepEqual([...getRequiredStoreDataSections('PUT', '/api/categories/cat-1')].sort(), ['adminUser', 'categories'].sort());
  assert.deepEqual([...getRequiredStoreDataSections('DELETE', '/api/categories/cat-1')], ['adminUser']);
});

test('product writes load only collections required by the operation', () => {
  assert.deepEqual([...getRequiredStoreDataSections('POST', '/api/products')].sort(), ['adminUser', 'categories'].sort());
  assert.deepEqual([...getRequiredStoreDataSections('PUT', '/api/products/prod-1')].sort(), ['adminUser', 'categories'].sort());
  assert.deepEqual([...getRequiredStoreDataSections('DELETE', '/api/products/prod-1')], ['adminUser']);
});

test('offer reads and writes use operation-specific scopes', () => {
  assert.deepEqual([...getRequiredStoreDataSections('GET', '/api/offers')].sort(), ['adminUser', 'offers'].sort());
  assert.deepEqual([...getRequiredStoreDataSections('POST', '/api/offers')].sort(), ['adminUser', 'products'].sort());
  assert.deepEqual(
    [...getRequiredStoreDataSections('PUT', '/api/offers/offer-1')].sort(),
    ['adminUser', 'offers', 'products'].sort()
  );
  assert.deepEqual([...getRequiredStoreDataSections('DELETE', '/api/offers/offer-1')], ['adminUser']);
  assert.deepEqual([...getRequiredStoreDataSections('POST', '/api/offers/delete')], ['adminUser']);
});

test('checkout and order tracking load the data required by each operation', () => {
  assert.deepEqual([...getRequiredStoreDataSections('POST', '/api/orders')].sort(), ['adminUser', 'settings', 'products', 'offers'].sort());
  assert.deepEqual([...getRequiredStoreDataSections('POST', '/api/orders/track')].sort(), ['adminUser', 'orders'].sort());
  assert.deepEqual([...getRequiredStoreDataSections('GET', '/api/orders')].sort(), ['adminUser', 'orders'].sort());
});

test('admin analytics uses SQL aggregates without hydrating store collections', () => {
  assert.deepEqual([...getRequiredStoreDataSections('GET', '/api/admin/stats')], ['adminUser']);
});

test('admin authentication endpoints only require the admin record', () => {
  assert.deepEqual([...getRequiredStoreDataSections('POST', '/api/admin/login')], ['adminUser']);
});

test('paginated product reads use SQL joins without hydrating full collections', () => {
  const scopes = getRequiredStoreDataSections('GET', '/api/products', { page: '2', pageSize: '12' });
  assert.deepEqual([...scopes], ['adminUser']);
});

test('paginated order reads load only the administrator record before SQL paging', () => {
  const scopes = getRequiredStoreDataSections('GET', '/api/orders', { page: '1', pageSize: '10' });
  assert.deepEqual([...scopes], ['adminUser']);
});

test('legacy non-paginated reads retain complete collection scopes', () => {
  assert.deepEqual(
    [...getRequiredStoreDataSections('GET', '/api/products')].sort(),
    ['adminUser', 'categories', 'products'].sort()
  );
  assert.deepEqual(
    [...getRequiredStoreDataSections('GET', '/api/orders')].sort(),
    ['adminUser', 'orders'].sort()
  );
});
