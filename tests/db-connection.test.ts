import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNeonConnectionString } from '../src/server/db.ts';

test('Neon connection strings explicitly retain full TLS certificate verification', () => {
  const input = 'postgresql://tolip:secret@example.neon.tech/tolip?sslmode=require&channel_binding=require';
  const normalized = new URL(normalizeNeonConnectionString(input));

  assert.equal(normalized.searchParams.get('sslmode'), 'verify-full');
  assert.equal(normalized.searchParams.get('channel_binding'), 'require');
  assert.equal(normalized.hostname, 'example.neon.tech');
  assert.equal(normalized.pathname, '/tolip');
});

test('non-PostgreSQL connection strings are left unchanged', () => {
  const input = 'https://example.test/database';
  assert.equal(normalizeNeonConnectionString(input), input);
});

test('keyword-style connection strings are left unchanged', () => {
  const input = 'host=example.neon.tech dbname=tolip sslmode=require';
  assert.equal(normalizeNeonConnectionString(input), input);
});
