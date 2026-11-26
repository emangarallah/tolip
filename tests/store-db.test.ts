import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const runtimeProcess = (globalThis as any).process;
const originalCwd = runtimeProcess.cwd();
const tempRoot = mkdtempSync(join(tmpdir(), 'tolip-store-test-'));
mkdirSync(join(tempRoot, 'data'), { recursive: true });
runtimeProcess.chdir(tempRoot);

// Import after changing cwd so the store's JSON file is isolated from the repository.
const { db } = await import('../src/server/db.ts');

after(() => {
  runtimeProcess.chdir(originalCwd);
  rmSync(tempRoot, { recursive: true, force: true });
});

test('seed data includes the requested store catalog and valid category links', () => {
  const categories = db.getCategories(true);
  const products = db.getProducts({ includeInactive: true });
  assert.equal(categories.length, 7);
  assert.equal(products.length, 25);
  assert.ok(products.every((product: any) => categories.some((category: any) => category.id === product.categoryId)));
  assert.ok(products.every((product: any) => product.variants.length > 0));
});

test('admin can create, update and delete a category and product persistently', () => {
  const category = db.createCategory({
    name: 'Test Category',
    slug: 'test-category-' + Date.now(),
    description: '',
    image: '',
    sortOrder: 99,
    isActive: true,
  });
  assert.ok(db.getCategoryById(category.id));

  const updatedCategory = db.updateCategory(category.id, { name: 'Updated Test Category' });
  assert.equal(updatedCategory?.name, 'Updated Test Category');

  const product = db.createProduct({
    name: 'Test Product',
    slug: 'test-product-' + Date.now(),
    categoryId: category.id,
    description: '',
    features: [],
    usageInstructions: '',
    images: [],
    variants: [{ id: 'test-variant', name: 'Small', price: 100, stock: 3 }],
    isFeatured: false,
    isBestSeller: false,
    isActive: true,
    inStock: true,
  });
  assert.equal(db.getProductById(product.id)?.name, 'Test Product');

  const updatedProduct = db.updateProduct(product.id, {
    variants: [{ id: 'test-variant', name: 'Small', price: 125, stock: 2 }],
  });
  assert.equal(updatedProduct?.variants[0].price, 125);
  assert.equal(updatedProduct?.variants[0].stock, 2);

  assert.equal(db.deleteProduct(product.id), true);
  assert.equal(db.getProductById(product.id), undefined);
  assert.equal(db.deleteCategory(category.id), true);
  assert.equal(db.getCategoryById(category.id), undefined);

  const persisted = JSON.parse(readFileSync(join(tempRoot, 'data', 'store_database.runtime.json'), 'utf8'));
  assert.ok(!persisted.products.some((entry: any) => entry.id === product.id));
  assert.ok(!persisted.categories.some((entry: any) => entry.id === category.id));
});

test('admin password is scrypt-verified and login session rotation invalidates prior sessions', () => {
  const previousSession = db.getAdminSessionVersion();
  const email = 'owner-test@example.com';
  const password = 'T0lip-test-strong-password-2026!';
  db.updateAdminCredentials(email, password);

  assert.equal(db.verifyAdminCredentials(email, password), true);
  assert.equal(db.verifyAdminCredentials(email, 'incorrect-password'), false);
  const credentialSession = db.getAdminSessionVersion();
  assert.notEqual(credentialSession, previousSession);

  const nextSession = db.rotateAdminSession();
  assert.notEqual(nextSession, credentialSession);
  assert.equal(db.getAdminSessionVersion(), nextSession);
});

test('order creation stores the final WhatsApp message and status', () => {
  const product = db.getProducts()[0];
  const variant = product.variants.find((entry: any) => entry.stock > 0);
  assert.ok(variant);

  const order = db.createOrder({
    customerDetails: {
      fullName: 'Test Customer',
      phone: '771000000',
      city: 'صنعاء',
      area: 'الحي',
      detailedAddress: 'عنوان اختبار',
    },
    items: [{
      productId: product.id,
      productName: product.name,
      variantId: variant.id,
      variantName: variant.name,
      quantity: 1,
      unitPrice: variant.price,
      totalPrice: variant.price,
      image: product.images[0],
    }],
    itemsTotal: variant.price,
    deliveryFee: 2000,
    finalTotal: variant.price === null ? null : variant.price + 2000,
    status: 'awaiting_whatsapp_confirmation',
    whatsappMessage: 'Initial message',
  });

  const finalMessage = 'Order ' + order.orderNumber + ' exact WhatsApp message';
  const updated = db.updateOrderWhatsAppMessage(order.id, finalMessage);
  assert.equal(updated?.whatsappMessage, finalMessage);

  const statusUpdated = db.updateOrderStatus(order.id, 'confirmed');
  assert.equal(statusUpdated?.status, 'confirmed');

  const persisted = JSON.parse(readFileSync(join(tempRoot, 'data', 'store_database.runtime.json'), 'utf8'));
  const savedOrder = persisted.orders.find((entry: any) => entry.id === order.id);
  assert.equal(savedOrder.whatsappMessage, finalMessage);
  assert.equal(savedOrder.status, 'confirmed');
});

test('request leases can be safely released when running without Neon locally', async () => {
  const finishRead = await db.beginRequest(true);
  await finishRead();

  const finishWrite = await db.beginRequest(false);
  await finishWrite();
});
