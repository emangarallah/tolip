import { db, verifyToken, type StoreDataSection } from '../../src/server/db.ts';
import type { OrderStatus } from '../../src/types/store.ts';

const ALLOWED_STATUSES = new Set<OrderStatus>([
  'new',
  'awaiting_whatsapp_confirmation',
  'confirmed',
  'processing',
  'out_for_delivery',
  'delivered',
  'cancelled',
]);

function sendJson(res: any, statusCode: number, payload: Record<string, unknown>) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(JSON.stringify(payload));
}

async function readRequestBody(req: any): Promise<Record<string, unknown>> {
  const body = req.body;

  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) return body;
  if (Buffer.isBuffer(body)) {
    const parsed = JSON.parse(body.toString('utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  }
  if (typeof body === 'string' && body.trim()) {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === 'object' ? parsed : {};
  }

  // Some mobile/serverless request adapters leave the JSON body as a stream.
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > 16 * 1024) throw new Error('Request body is too large.');
    chunks.push(buffer);
  }
  if (!chunks.length) return {};
  const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  return parsed && typeof parsed === 'object' ? parsed : {};
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { error: 'طريقة الطلب غير مدعومة.' });
    return;
  }

  const authorization = typeof req.headers?.authorization === 'string'
    ? req.headers.authorization
    : '';
  const token = authorization.startsWith('Bearer ')
    ? verifyToken(authorization.slice('Bearer '.length).trim())
    : null;

  if (!token || token.role !== 'admin') {
    sendJson(res, 401, { error: 'انتهت جلسة الإدارة. يرجى تسجيل الدخول مرة أخرى.' });
    return;
  }

  let context: Awaited<ReturnType<typeof db.beginRequest>> | null = null;
  let contextClosed = false;

  try {
    const body = await readRequestBody(req);
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    const status = typeof body.status === 'string' ? body.status as OrderStatus : null;

    if (!orderId || orderId.length > 128 || !status || !ALLOWED_STATUSES.has(status)) {
      sendJson(res, 400, { error: 'بيانات حالة الطلب غير صحيحة.' });
      return;
    }

    await db.initializePersistentStore();

    context = await db.beginRequest(
      false,
      new Set<StoreDataSection>(['orders']),
      { adminCandidate: token }
    );

    const updated = await db.runInRequest(context, async () => {
      const currentAdmin = db.getAdminInfo();
      const currentSessionVersion = db.getAdminSessionVersion();
      const isCurrentAdmin =
        currentAdmin.id === token.id &&
        currentAdmin.email.toLowerCase() === token.email.toLowerCase() &&
        currentSessionVersion === token.sessionVersion;

      if (!isCurrentAdmin) return null;

      return db.updateOrderStatusInStore(orderId, status);
    });

    await db.endRequest(context);
    contextClosed = true;

    if (!updated) {
      // A missing order and an expired admin session are distinguished without
      // revealing any order information to an unauthenticated request.
      sendJson(res, 404, { error: 'تعذر العثور على الطلب أو انتهت جلسة الإدارة. حدّثي الصفحة وسجّلي الدخول مجددًا.' });
      return;
    }

    sendJson(res, 200, {
      id: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });
  } catch (error: any) {
    if (context && !contextClosed) {
      try {
        await db.endRequest(context);
      } catch (closeError) {
        console.error('Order status transaction cleanup failed:', closeError);
      }
      contextClosed = true;
    }

    console.error('Dedicated order status API failed:', {
      name: error?.name,
      code: error?.code,
      message: error?.message,
      detail: error?.detail,
      constraint: error?.constraint,
    });

    sendJson(res, 500, {
      error: 'فشل حفظ حالة الطلب. تحققي من الاتصال ثم حاولي مرة أخرى.',
    });
  }
}
