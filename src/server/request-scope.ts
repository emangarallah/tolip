import type { StoreDataSection } from './db.ts';

const ALL_SECTIONS: StoreDataSection[] = [
  'adminUser',
  'settings',
  'categories',
  'products',
  'offers',
  'orders',
];

export function getRequiredStoreDataSections(method: string, path: string): Set<StoreDataSection> {
  const normalizedMethod = method.toUpperCase();
  const scopes = new Set<StoreDataSection>(['adminUser']);

  if (path.startsWith('/api/settings')) {
    scopes.add('settings');
  } else if (path.startsWith('/api/categories')) {
    scopes.add('categories');
    scopes.add('products');
  } else if (path.startsWith('/api/products')) {
    scopes.add('categories');
    scopes.add('products');
  } else if (path.startsWith('/api/offers')) {
    scopes.add('offers');
    scopes.add('products');
  } else if (path.startsWith('/api/orders')) {
    if (normalizedMethod === 'POST' && path === '/api/orders') {
      scopes.add('settings');
      scopes.add('products');
      scopes.add('offers');
    } else {
      scopes.add('orders');
    }
  } else if (path === '/api/admin/stats') {
    for (const section of ALL_SECTIONS) scopes.add(section);
  }

  return scopes;
}
