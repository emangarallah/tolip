export interface PaginationInput {
  page: number;
  pageSize: number;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function hasPaginationQuery(query: Record<string, unknown>): boolean {
  return query.page !== undefined || query.pageSize !== undefined;
}

export function parsePaginationQuery(query: Record<string, unknown>):
  | { ok: true; value: PaginationInput }
  | { ok: false; error: string } {
  const parsePositiveInteger = (value: unknown, fallback: number): number | null => {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  };

  const page = parsePositiveInteger(query.page, 1);
  const pageSize = parsePositiveInteger(query.pageSize, DEFAULT_PAGE_SIZE);

  if (page === null) return { ok: false, error: 'رقم الصفحة يجب أن يكون عددًا صحيحًا أكبر من صفر.' };
  if (pageSize === null) return { ok: false, error: 'حجم الصفحة يجب أن يكون عددًا صحيحًا أكبر من صفر.' };
  if (pageSize > MAX_PAGE_SIZE) {
    return { ok: false, error: `حجم الصفحة لا يمكن أن يتجاوز ${MAX_PAGE_SIZE} عنصرًا.` };
  }

  return { ok: true, value: { page, pageSize } };
}
