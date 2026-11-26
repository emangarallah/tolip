import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getRequiredStoreDataSections } from '../src/server/request-scope.ts';

test('public catalog requests load only their related store data', () => {
  assert.deepEqual([...getRequiredStoreDataSections('GET', '/api/products')].sort(), ['adminUser', 'categories', 'products'].sort());
  assert.deepEqual([...getRequiredStoreDataSections('GET', '/api/categories')].sort(), ['adminUser', 'categories', 'products'].sort());
  assert.deepEqual([...getRequiredStoreDataSections('GET', '/api/settings')].sort(), ['adminUser', 'settings'].sort());
  assert.deepEqual([...getRequiredStoreDataSections('GET', '/api/offers')].sort(), ['adminUser', 'offers', 'products'].sort());
});

test('checkout and order tracking load the data required by each operation', () => {
  assert.deepEqual([...getRequiredStoreDataSections('POST', '/api/orders')].sort(), ['adminUser', 'settings', 'products', 'offers'].sort());
  assert.deepEqual([...getRequiredStoreDataSections('POST', '/api/orders/track')].sort(), ['adminUser', 'orders'].sort());
  assert.deepEqual([...getRequiredStoreDataSections('GET', '/api/orders')].sort(), ['adminUser', 'orders'].sort());
});

test('admin analytics intentionally loads all relational sections', () => {
  assert.deepEqual([...getRequiredStoreDataSections('GET', '/api/admin/stats')].sort(), ['adminUser', 'settings', 'categories', 'products', 'offers', 'orders'].sort());
});

test('admin authentication endpoints only require the admin record', () => {
  assert.deepEqual([...getRequiredStoreDataSections('POST', '/api/admin/login')], ['adminUser']);
});


test('paginated product reads skip loading the complete products collection', () => {
  const scopes = getRequiredStoreDataSections('GET', '/api/products', { page: '2', pageSize: '12' });
  assert.deepEqual([...scopes].sort(), ['adminUser', 'categories'].sort());
});

test('paginated order reads load only the administrator record before SQL paging', () => {
  const scopes = getRequiredStoreDataSections('GET', '/api/orders', { page: '1', pageSize: '10' });
  assert.deepEqual([...scopes], ['adminUser']);
});

test('legacy non-paginated API requests retain their complete collection scopes', () => {
  assert.deepEqual(
    [...getRequiredStoreDataSections('GET', '/api/products')].sort(),
    ['adminUser', 'categories', 'products'].sort()
  );
  assert.deepEqual(
    [...getRequiredStoreDataSections('GET', '/api/orders')].sort(),
    ['adminUser', 'orders'].sort()
  );
});
