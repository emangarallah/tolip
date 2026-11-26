import test from 'node:test';
import assert from 'node:assert/strict';
import { consumeRateLimit, applySecurityHeaders, validateOrderPayload } from '../src/server/middleware/security.ts';

test('rate limiter allows configured number and returns retry time after limit', () => {
  const key = `security-test-${crypto.randomUUID()}`;
  const start = 1_000_000;
  assert.equal(consumeRateLimit(key, 2, 60_000, start).allowed, true);
  assert.equal(consumeRateLimit(key, 2, 60_000, start + 1).allowed, true);
  const blocked = consumeRateLimit(key, 2, 60_000, start + 2);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.equal(blocked.retryAfterSeconds, 60);
  assert.equal(consumeRateLimit(key, 2, 60_000, start + 60_001).allowed, true);
});

test('security headers prevent MIME sniffing, framing and plugin content', () => {
  const headers: Record<string, string> = {};
  const response = {
    setHeader(name: string, value: string) { headers[name] = value; },
  } as any;
  let called = false;
  applySecurityHeaders({} as any, response, () => { called = true; });
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.equal(called, true);
});

test('order payload rejects oversized customer fields and unsafe URL protocols', () => {
  const makeResponse = () => {
    const result: { statusCode?: number; body?: unknown } = {};
    const res = {
      status(code: number) { result.statusCode = code; return this; },
      json(body: unknown) { result.body = body; return this; },
    };
    return { res: res as any, result };
  };

  const oversized = makeResponse();
  validateOrderPayload({
    body: { customerDetails: { fullName: 'x'.repeat(121) }, items: [] },
  } as any, oversized.res, (() => { throw new Error('next should not run'); }) as any);
  assert.equal(oversized.result.statusCode, 400);

  const unsafeUrl = makeResponse();
  validateOrderPayload({
    body: { customerDetails: { googleMapsUrl: 'javascript:alert(1)' }, items: [] },
  } as any, unsafeUrl.res, (() => { throw new Error('next should not run'); }) as any);
  assert.equal(unsafeUrl.result.statusCode, 400);
});

test('order payload accepts bounded fields and HTTP(S) map links', () => {
  const response = { statusCode: 200 };
  let called = false;
  validateOrderPayload({
    body: {
      customerDetails: { fullName: 'Customer', googleMapsUrl: 'https://maps.google.com/?q=Sanaa' },
      items: [{ productId: 'p', variantId: 'v', quantity: 1 }],
    },
  } as any, {
    status(code: number) { response.statusCode = code; return this; },
    json() { return this; },
  } as any, (() => { called = true; }) as any);
  assert.equal(called, true);
});
