import type { Request, Response, NextFunction } from 'express';
import { db, verifyToken } from '../db.ts';

// Admin authentication and login throttling middleware.
// Validate the bearer token against the current admin record, not only its signature.
export function getAdminPayload(req: Request): { email: string; id: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const currentAdmin = db.getAdminInfo();
  if (
    payload.role !== 'admin' ||
    payload.id !== currentAdmin.id ||
    payload.email.toLowerCase() !== currentAdmin.email.toLowerCase() ||
    payload.sessionVersion !== db.getAdminSessionVersion()
  ) {
    return null;
  }

  return payload;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const payload = getAdminPayload(req);
  if (!payload) {
    res.status(401).json({ error: 'غير مصرح لك بالوصول. يرجى تسجيل الدخول كمسؤول.' });
    return;
  }

  (req as any).admin = payload;
  next();
}

const loginAttemptBuckets = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;

function getLoginRateLimitIdentity(req: Request) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const email = typeof req.body?.email === 'string'
    ? req.body.email.trim().toLowerCase().slice(0, 254)
    : '';
  return { ip, email };
}

export async function isLoginRateLimited(req: Request): Promise<boolean> {
  const { ip, email } = getLoginRateLimitIdentity(req);

  // Production uses an atomic, shared Neon counter so all Vercel instances
  // enforce the same window. A database error fails closed via the route handler.
  const ipLimit = await db.consumePersistentRateLimit(`admin-login:ip:${ip}`, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
  if (ipLimit) {
    const accountLimit = email
      ? await db.consumePersistentRateLimit(`admin-login:account:${email}`, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS)
      : null;
    return !ipLimit.allowed || Boolean(accountLimit && !accountLimit.allowed);
  }

  // Local development fallback; never used in production after Neon initializes.
  const now = Date.now();
  const keys = [`ip:${ip}`, ...(email ? [`account:${email}`] : [])];
  let blocked = false;
  for (const key of keys) {
    let bucket = loginAttemptBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
      loginAttemptBuckets.set(key, bucket);
    }
    if (bucket.count >= LOGIN_MAX_ATTEMPTS) {
      blocked = true;
    } else {
      bucket.count += 1;
    }
  }

  if (loginAttemptBuckets.size > 5000) {
    for (const [key, attempt] of loginAttemptBuckets) {
      if (attempt.resetAt <= now) loginAttemptBuckets.delete(key);
    }
  }
  return blocked;
}

export async function clearLoginAttempts(req: Request): Promise<void> {
  const { ip, email } = getLoginRateLimitIdentity(req);
  await db.clearPersistentRateLimit(`admin-login:ip:${ip}`);
  if (email) await db.clearPersistentRateLimit(`admin-login:account:${email}`);
  loginAttemptBuckets.delete(`ip:${ip}`);
  if (email) loginAttemptBuckets.delete(`account:${email}`);
}
