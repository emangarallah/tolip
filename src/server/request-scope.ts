import type { StoreDataSection } from './db.ts';
import { hasPaginationQuery } from './pagination.ts';

const ALL_SECTIONS: StoreDataSection[] = [
  'adminUser',
  'settings',
  'categories',
  'products',
  'offers',
  'orders',
];

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
  } else if (path.startsWith('/api/categories')) {
    scopes.add('categories');
    scopes.add('products');
  } else if (path.startsWith('/api/products')) {
    scopes.add('categories');
    if (!paginated) scopes.add('products');
  } else if (path.startsWith('/api/offers')) {
    scopes.add('offers');
    if (normalizedMethod === 'POST' || normalizedMethod === 'PUT') {
      scopes.add('products');
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
    for (const section of ALL_SECTIONS) scopes.add(section);
  }

  return scopes;
}
