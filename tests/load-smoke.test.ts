import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';

const runtimeProcess = (globalThis as any).process;
const originalCwd = runtimeProcess.cwd();
const originalNodeEnv = runtimeProcess.env.NODE_ENV;
const originalVercel = runtimeProcess.env.VERCEL;
const tempRoot = mkdtempSync(join(tmpdir(), 'tolip-load-smoke-'));
mkdirSync(join(tempRoot, 'data'), { recursive: true });
copyFileSync(fileURLToPath(new URL('../data/store_database.json', import.meta.url)), join(tempRoot, 'data', 'store_database.json'));
runtimeProcess.chdir(tempRoot);
runtimeProcess.env.NODE_ENV = 'test';
runtimeProcess.env.VERCEL = '1';

const [{ default: app }, { db, generateToken }] = await Promise.all([
  import('../server.ts'),
  import('../src/server/db.ts'),
]);
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Could not resolve the local load-test server address.');
const baseUrl = `http://127.0.0.1:${address.port}`;

const admin = db.getAdminInfo();
const adminToken = generateToken({
  email: admin.email,
  id: admin.id,
  sessionVersion: db.getAdminSessionVersion(),
  role: 'admin',
});
const testProductId = 'prod-whitening-cream';
const testVariantId = 'v-wc-large';

after(async () => {
  server.closeAllConnections?.();
  await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
  runtimeProcess.chdir(originalCwd);
  if (originalNodeEnv === undefined) delete runtimeProcess.env.NODE_ENV;
  else runtimeProcess.env.NODE_ENV = originalNodeEnv;
  if (originalVercel === undefined) delete runtimeProcess.env.VERCEL;
  else runtimeProcess.env.VERCEL = originalVercel;
  rmSync(tempRoot, { recursive: true, force: true });
});

function percentile(values: number[], ratio: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)] || 0;
}

test('local API absorbs concurrent storefront reads and isolated test orders', { timeout: 30000 }, async () => {
  const headers = { Authorization: `Bearer ${adminToken}` };
  const tasks: Array<() => Promise<{ kind: string; status: number; durationMs: number; body: any }>> = [];

  for (let index = 0; index < 30; index += 1) {
    tasks.push(async () => {
      const started = performance.now();
      const response = await fetch(`${baseUrl}/api/products?page=${(index % 3) + 1}&pageSize=8`);
      const body = await response.json();
      return { kind: 'product-read', status: response.status, durationMs: performance.now() - started, body };
    });
  }

  for (let index = 0; index < 10; index += 1) {
    tasks.push(async () => {
      const started = performance.now();
      const response = await fetch(`${baseUrl}/api/categories`);
      const body = await response.json();
      return { kind: 'category-read', status: response.status, durationMs: performance.now() - started, body };
    });
  }

  for (let index = 0; index < 12; index += 1) {
    tasks.push(async () => {
      const started = performance.now();
      const response = await fetch(`${baseUrl}/api/orders?page=1&pageSize=10`, { headers });
      const body = await response.json();
      return { kind: 'order-read', status: response.status, durationMs: performance.now() - started, body };
    });
  }

  for (let index = 0; index < 12; index += 1) {
    tasks.push(async () => {
      const started = performance.now();
      const response = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerDetails: {
            fullName: `Load Test Customer ${index + 1}`,
            phone: `77010010${String(index).padStart(2, '0')}`,
            city: 'صنعاء',
            area: 'بيئة اختبار',
            detailedAddress: `عنوان اختبار آلي رقم ${index + 1}`,
            notes: 'اختبار ضغط آلي محلي - لا يتم شحن هذا الطلب',
          },
          items: [{ productId: testProductId, variantId: testVariantId, quantity: 1 }],
        }),
      });
      const body = await response.json();
      return { kind: 'order-create', status: response.status, durationMs: performance.now() - started, body };
    });
  }

  const startedAll = performance.now();
  const results = await Promise.all(tasks.map((task) => task()));
  const totalDurationMs = performance.now() - startedAll;
  const failed = results.filter((item) => item.status < 200 || item.status >= 300);
  assert.equal(failed.length, 0, JSON.stringify(failed.slice(0, 3)));

  const productReads = results.filter((item) => item.kind === 'product-read');
  assert.ok(productReads.every((item) => Array.isArray(item.body.items)));
  assert.ok(productReads.every((item) => item.body.items.length <= 8));
  assert.ok(productReads.every((item) => item.body.total === 25));

  const createdOrders = results
    .filter((item) => item.kind === 'order-create')
    .map((item) => item.body.order);
  assert.equal(createdOrders.length, 12);
  assert.equal(new Set(createdOrders.map((order) => order.orderNumber)).size, 12);

  const finalOrdersResponse = await fetch(`${baseUrl}/api/orders?page=1&pageSize=20`, { headers });
  const finalOrders = await finalOrdersResponse.json();
  assert.equal(finalOrdersResponse.status, 200);
  assert.equal(finalOrders.total, 12);
  assert.equal(finalOrders.items.length, 12);

  const durations = results.map((item) => item.durationMs);
  console.log(
    `[Tolip load smoke] ${results.length} concurrent requests; ${totalDurationMs.toFixed(1)} ms total; ` +
    `p50 ${percentile(durations, 0.50).toFixed(1)} ms; p95 ${percentile(durations, 0.95).toFixed(1)} ms; ` +
    `max ${Math.max(...durations).toFixed(1)} ms; 12/12 test orders persisted.`
  );
});
