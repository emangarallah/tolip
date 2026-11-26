import type { Request, Response, NextFunction } from 'express';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message: string;
}

export function consumeRateLimit(key: string, max: number, windowMs: number, now = Date.now()): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
} {
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  if (bucket.count >= max) {
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  bucket.count += 1;
  if (buckets.size > 10000) {
    for (const [bucketKey, value] of buckets) if (value.resetAt <= now) buckets.delete(bucketKey);
  }
  return {
    allowed: true,
    remaining: Math.max(0, max - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function createRateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const client = req.ip || req.socket.remoteAddress || 'unknown';
    const result = consumeRateLimit(`${options.keyPrefix}:${client}`, options.max, options.windowMs);
    res.setHeader('RateLimit-Limit', String(options.max));
    res.setHeader('RateLimit-Remaining', String(result.remaining));
    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfterSeconds));
      res.status(429).json({ error: options.message });
      return;
    }
    next();
  };
}

export function validateOrderPayload(req: Request, res: Response, next: NextFunction): void {
  const customer = req.body?.customerDetails;
  if (!customer || typeof customer !== 'object' || Array.isArray(customer)) {
    res.status(400).json({ error: 'بيانات العميل غير صحيحة.' });
    return;
  }
  const limits: Record<string, number> = {
    fullName: 120, phone: 32, city: 80, area: 120, detailedAddress: 500,
    nearestLandmark: 200, notes: 1000, preferredContactTime: 100, googleMapsUrl: 2048,
  };
  for (const [field, maxLength] of Object.entries(limits)) {
    const value = customer[field];
    if (value !== undefined && value !== null && (typeof value !== 'string' || value.length > maxLength)) {
      res.status(400).json({ error: 'أحد حقول بيانات العميل أطول من الحد المسموح أو غير صحيح.' });
      return;
    }
  }
  if (customer.googleMapsUrl) {
    try {
      const parsed = new URL(customer.googleMapsUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported protocol');
    } catch {
      res.status(400).json({ error: 'رابط الموقع يجب أن يكون رابط HTTP أو HTTPS صحيحًا.' });
      return;
    }
  }
  if (Array.isArray(req.body.items) && req.body.items.length > 25) {
    res.status(400).json({ error: 'يمكن إرسال 25 منتجًا كحد أقصى في الطلب الواحد.' });
    return;
  }
  next();
}

export function applySecurityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', "object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}
