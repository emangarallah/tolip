import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getNeonInitializationLockQuery,
  normalizeNeonConnectionString,
} from '../src/server/db.ts';

test('Neon URLs explicitly retain full TLS certificate verification', () => {
  const input = 'postgresql://tolip:secret@example.neon.tech/tolip?sslmode=require&channel_binding=require';
  const normalized = new URL(normalizeNeonConnectionString(input));

  assert.equal(normalized.searchParams.get('sslmode'), 'verify-full');
  assert.equal(normalized.searchParams.get('channel_binding'), 'require');
  assert.equal(normalized.hostname, 'example.neon.tech');
  assert.equal(normalized.pathname, '/tolip');
});

test('non-PostgreSQL and keyword connection strings remain unchanged', () => {
  const https = 'https://example.test/database';
  const keyword = 'host=example.neon.tech dbname=tolip sslmode=require';

  assert.equal(normalizeNeonConnectionString(https), https);
  assert.equal(normalizeNeonConnectionString(keyword), keyword);
});

test('a fully migrated store with RLS and a repaired perfume category can share the initialization lock', () => {
  assert.equal(
    getNeonInitializationLockQuery({
      schemaReady: true,
      migrationsReady: true,
      rowLevelSecurityReady: true,
      perfumeCategoryReady: true,
    }),
    'SELECT pg_advisory_xact_lock_shared(7319462027)'
  );
});

test('incomplete database readiness always requires the exclusive initialization lock', () => {
  const base = {
    schemaReady: true,
    migrationsReady: true,
    rowLevelSecurityReady: true,
    perfumeCategoryReady: true,
  };
  const checks = [
    { ...base, schemaReady: false },
    { ...base, migrationsReady: false },
    { ...base, rowLevelSecurityReady: false },
    { ...base, perfumeCategoryReady: false },
  ];

  for (const readiness of checks) {
    assert.equal(
      getNeonInitializationLockQuery(readiness),
      'SELECT pg_advisory_xact_lock(7319462027)'
    );
  }
});
