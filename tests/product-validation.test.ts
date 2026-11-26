import test from 'node:test';
import assert from 'node:assert/strict';
import { isSafeAssetReference, validateProductVariants } from '../src/server/validation/product.ts';

test('product variants reject duplicate IDs and malformed stock or prices', () => {
  assert.match(validateProductVariants([
    { id: 'same', name: 'Small', price: 100, stock: 2 },
    { id: 'same', name: 'Large', price: 120, stock: 1 },
  ]) || '', /تكرار/);

  assert.match(validateProductVariants([
    { id: 'v1', name: 'Small', price: 100, stock: '2' },
  ]) || '', /المخزون/);

  assert.match(validateProductVariants([
    { id: 'v1', name: 'Small', price: Number.MAX_VALUE, stock: 2 },
  ]) || '', /سعر المنتج/);

  assert.equal(validateProductVariants([
    { id: 'v1', name: 'Small', price: null, originalPrice: null, stock: 0 },
  ]), null);
});

test('asset references allow local paths and HTTP(S), but reject script and protocol-relative URLs', () => {
  assert.equal(isSafeAssetReference('/src/assets/images/item.webp'), true);
  assert.equal(isSafeAssetReference('https://cdn.example.com/item.webp'), true);
  assert.equal(isSafeAssetReference('javascript:alert(1)'), false);
  assert.equal(isSafeAssetReference('//evil.example/item.webp'), false);
  assert.equal(isSafeAssetReference('data:text/html,<script>alert(1)</script>'), false);
});
