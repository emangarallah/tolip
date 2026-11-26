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

export function isLoginRateLimited(req: Request): boolean {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let bucket = loginAttemptBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    loginAttemptBuckets.set(key, bucket);
  }
  if (bucket.count >= LOGIN_MAX_ATTEMPTS) return true;
  bucket.count += 1;

  if (loginAttemptBuckets.size > 5000) {
    for (const [ip, attempt] of loginAttemptBuckets) {
      if (attempt.resetAt <= now) loginAttemptBuckets.delete(ip);
    }
  }
  return false;
}
