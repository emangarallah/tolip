const READ_ONLY_METHODS = new Set(['GET', 'HEAD']);

export function isReadOnlyStoreRequest(method: string, path: string): boolean {
  const normalizedMethod = method.toUpperCase();
  if (READ_ONLY_METHODS.has(normalizedMethod)) return true;

  // Image uploads use Vercel Blob and only read the admin session from Neon.
  // Do not hold an exclusive store-write lock while the external upload runs.
  return normalizedMethod === 'POST' && (path === '/api/upload' || path === '/api/upload/');
}
