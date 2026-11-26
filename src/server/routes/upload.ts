import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { put } from '@vercel/blob';
import { requireAdmin } from '../middleware/admin-auth.ts';
import { UPLOADS_DIR } from '../storage/uploads.ts';

const router = Router();

function hasImageSignature(buffer: Buffer, mime: string): boolean {
  if (mime === 'image/png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === 'image/gif') return buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'));
  if (mime === 'image/webp') return buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  return false;
}

// Upload API endpoint; authorization is required and the file signature is checked
// independently from the client-provided data URL MIME type.
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
    if (buffer.length === 0 || buffer.length > 8 * 1024 * 1024) {
      res.status(413).json({ error: 'حجم الصورة غير صحيح أو يتجاوز 8 ميجابايت' });
      return;
    }
    if (!hasImageSignature(buffer, mime)) {
      res.status(400).json({ error: 'محتوى الملف لا يطابق صيغة الصورة المحددة.' });
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

export default router;
