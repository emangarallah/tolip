import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isReadOnlyStoreRequest } from '../src/server/request-mode.ts';

test('GET and HEAD API requests use shared read locks', () => {
  assert.equal(isReadOnlyStoreRequest('GET', '/api/products'), true);
  assert.equal(isReadOnlyStoreRequest('HEAD', '/api/settings'), true);
  assert.equal(isReadOnlyStoreRequest('get', '/api/categories'), true);
});

test('database-changing requests use exclusive locks', () => {
  assert.equal(isReadOnlyStoreRequest('POST', '/api/orders'), false);
  assert.equal(isReadOnlyStoreRequest('PUT', '/api/products/prod-1'), false);
  assert.equal(isReadOnlyStoreRequest('PATCH', '/api/orders/ord-1/status'), false);
  assert.equal(isReadOnlyStoreRequest('DELETE', '/api/categories/cat-1'), false);
  assert.equal(isReadOnlyStoreRequest('OPTIONS', '/api/products'), false);
});

test('Blob uploads use shared locks because they do not mutate store state', () => {
  assert.equal(isReadOnlyStoreRequest('POST', '/api/upload'), true);
  assert.equal(isReadOnlyStoreRequest('POST', '/api/upload/'), true);
});
