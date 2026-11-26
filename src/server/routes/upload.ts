import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { put } from '@vercel/blob';
import { requireAdmin } from '../middleware/admin-auth.ts';
import { UPLOADS_DIR } from '../storage/uploads.ts';

const router = Router();

// ==========================================
// 6. Image Upload API (Base64 file storage)
// ==========================================
router.post('/api/upload', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { base64Data } = req.body;
    if (typeof base64Data !== 'string' || !base64Data) {
      res.status(400).json({ error: 'بيانات الصورة مفقودة' });
      return;
    }
    const matches = base64Data.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/i);
    if (!matches || matches.length !== 3) {
      res.status(400).json({ error: 'صيغة الصورة غير صحيحة' });
      return;
    }
    const mime = matches[1].toLowerCase() === 'jpg' ? 'image/jpeg' : `image/${matches[1].toLowerCase()}`;
    const buffer = Buffer.from(matches[2], 'base64');
    if (buffer.length > 8 * 1024 * 1024) {
      res.status(413).json({ error: 'حجم الصورة يجب ألا يتجاوز 8 ميجابايت' });
      return;
    }
    const extension = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
    const safeName = `tolip/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        res.status(503).json({ error: 'تخزين الصور غير مهيأ. تواصل مع مدير المتجر.' });
        return;
      }
      const blob = await put(safeName, buffer, { access: 'public', contentType: mime, addRandomSuffix: true });
      res.json({ success: true, url: blob.url });
      return;
    }
    const filePath = path.join(UPLOADS_DIR, safeName.replace(/\//g, '-'));
    fs.writeFileSync(filePath, buffer);
    res.json({ success: true, url: `/uploads/${path.basename(filePath)}` });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'فشل في رفع الصورة' });
  }
});

// 7. Vite Integration (SPA & Static Serving)
// ==========================================
let initialization: Promise<void> | null = null;
export function initializeApp(): Promise<void> {
  if (!initialization) initialization = db.initializePersistentStore();
  return initialization;
}

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  router.get('*', (req: Request, res: Response) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

async function startServer() {
  if (isProduction) await initializeApp();
  else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    router.use(vite.middlewares);
  }
  router.listen(PORT, '0.0.0.0', () => {
    console.log(`🌸 متجر توليب للعناية الطبيعية شغال على http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default app;

export default router;
