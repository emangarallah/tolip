# Tolip Application Architecture

## Architecture style

Tolip uses a **modular monolith**: one React storefront, one Express API process, and one Neon-backed persistence layer. The API is divided by business area, but it is not a microservices system and it does not require separate deployments for each module.

## Request flow

```text
Browser (React + Vite)
        |
        | /api/*
        v
server.ts (Express composition root)
        |
        +-- shared middleware
        |     +-- JSON body parsing
        |     +-- Neon request lock / persistence boundary
        |     +-- static assets
        |
        +-- route modules
        |     +-- routes/settings.ts
        |     +-- routes/categories.ts
        |     +-- routes/offers.ts
        |     +-- routes/products.ts
        |     +-- routes/orders.ts
        |     +-- routes/admin.ts
        |     +-- routes/upload.ts
        |
        +-- middleware/admin-auth.ts
        +-- services/offers.ts
        +-- validation/product.ts
        +-- storage/uploads.ts
        |
        v
src/server/db.ts (StoreDatabase)
        |
        +-- Neon PostgreSQL in production
        +-- local seed/runtime persistence in development
```

## Module responsibilities

- **server.ts** is the composition root. It configures Express, shared middleware, route mounting, Vite development integration, and the production SPA fallback.
- **routes/** contains HTTP endpoints grouped by feature. Route paths and request/response contracts remain the same.
- **middleware/admin-auth.ts** contains administrator-token validation, the protected-route middleware, login throttling, and the successful-login counter reset.
- **services/offers.ts** contains offer validation and activation rules shared by offer management and order checkout.
- **validation/product.ts** validates product variants.
- **storage/uploads.ts** prepares the local development upload directory; **routes/upload.ts** handles uploads through Vercel Blob in production and the local upload directory in development.
- **db.ts** remains the single persistence adapter and owns the current store data model and Neon synchronization.

## Compatibility and safety boundaries

1. Keep existing `/api/*` paths, HTTP methods, authorization rules, and response shapes stable during structural refactors.
2. Keep the storefront, checkout, WhatsApp order flow, admin dashboard, and existing Neon data format unchanged unless a separately reviewed feature explicitly requires a change.
3. Put new HTTP endpoints in the matching route module; mount that router in `server.ts`.
4. Put rules shared by multiple routes in `services/` or `validation/` rather than duplicating them.
5. Any future database schema or persistence-format change must be a separate, migration-backed task with a rollback plan.

## Current limitation

This is a modular-monolith foundation, not a complete Clean Architecture implementation. The `StoreDatabase` class still combines persistence operations and several domain operations. It should only be decomposed further in small, tested steps; do not replace the Neon adapter or rewrite the data model as part of routine route refactoring.


## Request concurrency and availability

Production API requests use PostgreSQL advisory locks around the shared JSONB store. Read-only requests acquire a shared lock and do not rewrite the stored snapshot, allowing multiple reads to proceed together. Mutating requests acquire an exclusive lock and persist once after the route completes, preserving cross-instance write consistency. Lock acquisition and database statements have bounded timeouts so contention or a slow database returns a controlled service-unavailable response rather than waiting for the Vercel function limit. The `/api/health` endpoint performs a lightweight database check without acquiring the store advisory lock.


## Normalized PostgreSQL store

Production data is stored in separate relational tables: admin users, store settings, categories, products, product variants, offers, offer-product links, orders, and order items. JSONB is retained only for flexible product attributes, store settings, and customer details; it is no longer the single source of truth for the whole store.

The first production startup applies `migrations/001_normalized_store.sql` inside a transaction and copies the legacy `tolip_store_state` snapshot into the normalized tables. The legacy row is retained unchanged as a recovery snapshot. Requests load only the data sections needed by the route. Each mutation writes only the affected record(s) and related variants/links/items in the same transaction.

API reads use transaction-scoped shared advisory locks; writes use transaction-scoped exclusive locks. These locks are released automatically on commit/rollback and remain compatible with transaction-mode connection pooling. Request state is isolated with AsyncLocalStorage so concurrent reads cannot overwrite one another's in-memory data. Lock and statement timeouts are bounded to return a controlled 503 before the Vercel execution limit.

The original JSONB snapshot is deliberately not dual-written after cutover. The migration is additive and retains the legacy snapshot, but after new relational writes begin, a rollback must use a forward-compatible code release or restore/reconcile the legacy snapshot; deploying an older application build that reads only `tolip_store_state` would not see subsequent writes.


## Server-side pagination and load verification

The admin product list uses `GET /api/products?page=1&pageSize=12` with optional `search`, `categoryId`, and `includeInactive` filters. The admin order list uses `GET /api/orders?page=1&pageSize=10` with optional `status` and `search`. Paginated responses include `items`, `page`, `pageSize`, `total`, `totalPages`, `hasNextPage`, and `hasPreviousPage`. Page size is bounded to 100. Requests without `page` or `pageSize` retain the legacy array response for compatibility.

For Neon-backed requests, COUNT and LIMIT/OFFSET are executed in PostgreSQL; product variants and order items are fetched only for the selected page. Pagination requests do not hydrate full product/order collections into request memory. The storefront's existing unpaginated product endpoint remains unchanged until its search/filter UX is migrated separately.

`tests/load-smoke.test.ts` starts an isolated local copy of the Express API and simulates concurrent catalog reads, order-list reads, and 12 test order submissions. It records p50/p95/max response time and verifies all responses, unique order numbers, and persisted order count. It uses a temporary copy of the seed file and never connects to Neon or a deployed environment; it is a regression/load-smoke test, not a production capacity benchmark.
