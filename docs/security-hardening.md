# Tolip security hardening

This document records implemented application controls and the remaining deployment work. These changes are defense-in-depth, not a penetration-test certificate.

## 1. Secrets and browser exposure

- Runtime credentials belong in server-side Vercel environment variables only. Never use a `VITE_` prefix for a private key, database URL, bearer secret, admin password, or Blob token.
- `.env*` is ignored except the blank `.env.example`. Backup files, database dumps, local runtime databases, and private-key formats are also ignored.
- Production static output is `dist/`; the database seed and SQL migrations are included only in the API function bundle. Express explicitly returns 404 for `/data` and `/.private-data`.
- The checked-in seed file contains only a salted scrypt hash and placeholder bootstrap identity, not a plaintext password or customer orders. It is not the production database.
- The deployment environment contains the keys `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `APP_URL`, `NODE_ENV`, and `BLOB_READ_WRITE_TOKEN`. The four credential/token values must be configured as Vercel Sensitive variables with Secret visibility. Do not print or commit their values.

## 2. Password storage

- Admin passwords are stored as 64-byte `crypto.scrypt` hashes with a random per-password salt (hex-encoded in Neon). Authentication uses a timing-safe comparison.
- The production admin row was inspected: it contains a 128-character hex hash and a 32-character hex salt; no plaintext password column/value is stored.
- Password update and session rotation invalidate old admin sessions.

## 3. Database access and Row Level Security

Migration `migrations/002_row_level_security.sql` enables and forces RLS on the 11 existing application/legacy tables plus the new login-rate-limit table.

The application must connect as `tolip_runtime`, a least-privilege Neon role with `BYPASSRLS=false`. The old `tolip_admin` role has `BYPASSRLS=true` and must not be used by the live API after cutover.

Request policy:
- Public storefront requests can read active catalog data, public settings, and currently active offers.
- Guest checkout can insert only a server-generated order in the awaiting-confirmation state and item rows tied to that exact generated order ID.
- Guest order tracking can read only the order matching both the supplied order number and normalized phone number. The returned API DTO excludes customer address and phone.
- Admin access is elevated inside the transaction only after a signed token has been verified and its email, ID, and session version match the current Neon admin record.
- The full legacy snapshot and rate-limit counters are not public.

The current storefront has no customer sign-in/account ID. Guest order isolation is therefore based on order number plus phone, not an authenticated customer UUID. Add a real customer identity provider before claiming account-based ownership.

## 4. Server-side validation and price integrity

- Checkout accepts product/variant IDs and bounded quantities; product availability, variant stock, price, applicable discount, delivery fee, and totals are recomputed from Neon data and store settings.
- Product, category, offer, store-setting, checkout, and order-status routes validate bounded field types and allowlist writable properties. Server-generated IDs, timestamps, order status, and computed totals are not trusted from browser input.
- Product variant prices and stock use numeric/integer bounds. Asset URLs accept only local absolute paths or HTTP(S) references.

## 5. Rate limits

- Admin login: shared, atomic Neon counter by IP and normalized account identifier, 8 attempts per 15-minute window.
- API baseline: 180 requests/minute per process/IP.
- Checkout: 12 attempts/10 minutes per process/IP.
- Order tracking: 30 attempts/10 minutes per process/IP.

Only the login limiter is shared across Vercel instances. The general API, checkout, and tracking limits are per instance and should be paired with Vercel Firewall rate limits for a distributed production-wide edge policy.

## 6. Files, debug, and error handling

- `.env*`, local runtime databases, backups, dumps, and private-key artifacts are ignored.
- Production serves only the built `dist` folder; database and migration files are not mapped as public static assets.
- Express returns generic JSON for unknown API paths and unhandled API errors. Detailed error records stay in server logs; internal SQL/stack information is not sent in HTTP responses.
- Production Vercel config sets `NODE_ENV=production`; Vite dev middleware is not mounted in production.

## 7. Verification performed

- Neon migration 002 was prepared on an isolated branch and tested using `tolip_runtime`.
- Verified runtime role reported `BYPASSRLS=false`.
- Verified all 12 named tables had both `relrowsecurity=true` and `relforcerowsecurity=true`.
- Public role context returned active product/category rows but zero orders, admin users, and legacy snapshots.
- Login-email context exposed only the matching admin candidate.
- A synthetic guest test order became visible only when both the exact order number and phone were set; a wrong phone returned zero orders and zero items.
- The isolated migration branch was deleted after testing. No customer records were created or changed by these tests.
- Unit tests were added for product variant validation and safe asset references. CI is the final gate for the branch.

## 8. Required before production cutover

1. Apply migration 002 to the production Neon branch.
2. Update Vercel `DATABASE_URL` to the `tolip_runtime` connection. Store it as a Sensitive variable with Secret visibility and all needed environments.
3. Set `AUTH_SECRET`, `ADMIN_PASSWORD`, and `BLOB_READ_WRITE_TOKEN` to Sensitive/Secret visibility. Rotate a credential if it was ever committed or shared.
4. Merge and deploy the security branch only after the migration and runtime role are ready. The new server intentionally refuses startup when migration 002/RLS is missing.
5. Verify production `/api/health`, public catalog reads, admin login, order create, order tracking with a controlled test order, and that one customer's lookup cannot see another order.
6. Configure Vercel Firewall / edge limits for login, checkout, and order tracking. The application-level shared login limiter does not replace edge-level DDoS protection.

Until the migration, environment cutover, and production verification above are complete, treat production as not yet fully hardened.
