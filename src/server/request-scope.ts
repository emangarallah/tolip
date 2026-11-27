import type { StoreDataSection } from './db.ts';
import { hasPaginationQuery } from './pagination.ts';

export function getRequiredStoreDataSections(
  method: string,
  path: string,
  query: Record<string, unknown> = {}
): Set<StoreDataSection> {
  const normalizedMethod = method.toUpperCase();
  const scopes = new Set<StoreDataSection>(['adminUser']);
  const paginated = hasPaginationQuery(query);

  if (path.startsWith('/api/settings')) {
    scopes.add('settings');
  } else if (path === '/api/categories' || path.startsWith('/api/categories/')) {
    // Category reads and create/update need category rows. Deletion is a set-based SQL operation.
    if (normalizedMethod !== 'DELETE') scopes.add('categories');
  } else if (path === '/api/products' || path.startsWith('/api/products/')) {
    if (normalizedMethod === 'GET') {
      // Legacy full-catalog reads use the in-memory mapper. Paginated reads
      // join categories directly in SQL and need no full collection hydration.
      if (!paginated) {
        scopes.add('categories');
        scopes.add('products');
      }
    } else if (normalizedMethod === 'POST') {
      // Creating a product validates its category, but does not need the existing catalog.
      scopes.add('categories');
    } else if (normalizedMethod === 'PUT') {
      // Product edits read and write only their target row in SQL.
      scopes.add('categories');
    }
    // Product DELETE is a direct SQL DELETE; foreign keys cascade variants and offer links.
  } else if (path === '/api/offers' || path.startsWith('/api/offers/')) {
    const isOfferDeletion =
      (normalizedMethod === 'DELETE' && /^\/api\/offers\/[^/]+$/.test(path)) ||
      (normalizedMethod === 'POST' && (
        path === '/api/offers/delete' ||
        /^\/api\/offers\/[^/]+\/delete$/.test(path)
      ));

    if (!isOfferDeletion) {
      if (normalizedMethod === 'GET' || normalizedMethod === 'PUT') scopes.add('offers');
      if (normalizedMethod === 'POST' || normalizedMethod === 'PUT') scopes.add('products');
    }
  } else if (path.startsWith('/api/orders')) {
    if (normalizedMethod === 'POST' && path === '/api/orders') {
      scopes.add('settings');
      scopes.add('products');
      scopes.add('offers');
    } else if (!paginated) {
      scopes.add('orders');
    }
  } else if (path === '/api/admin/stats') {
    // Analytics currently reads only products, categories, and orders.
    // The analytics endpoint now uses aggregate SQL and the latest six joined orders.
    // It only needs the verified admin session loaded into the request context.
  }

  return scopes;
}
