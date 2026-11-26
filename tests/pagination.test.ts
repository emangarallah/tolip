import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasPaginationQuery, parsePaginationQuery } from '../src/server/pagination.ts';

test('pagination defaults safely and accepts bounded positive integers', () => {
  assert.equal(hasPaginationQuery({}), false);
  assert.equal(hasPaginationQuery({ page: '2' }), true);
  assert.deepEqual(parsePaginationQuery({}), {
    ok: true,
    value: { page: 1, pageSize: 20 },
  });
  assert.deepEqual(parsePaginationQuery({ page: '3', pageSize: '50' }), {
    ok: true,
    value: { page: 3, pageSize: 50 },
  });
});

test('pagination rejects invalid and excessive values', () => {
  assert.equal(parsePaginationQuery({ page: '0' }).ok, false);
  assert.equal(parsePaginationQuery({ page: '-2' }).ok, false);
  assert.equal(parsePaginationQuery({ page: '1.5' }).ok, false);
  assert.equal(parsePaginationQuery({ pageSize: '101' }).ok, false);
  assert.equal(parsePaginationQuery({ pageSize: 'many' }).ok, false);
});

test('a missing or empty page field falls back to page one', () => {
  assert.deepEqual(parsePaginationQuery({ page: '', pageSize: '10' }), {
    ok: true,
    value: { page: 1, pageSize: 10 },
  });
});
