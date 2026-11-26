import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import settingsRouter from './src/server/routes/settings.ts';
import categoriesRouter from './src/server/routes/categories.ts';
import offersRouter from './src/server/routes/offers.ts';
import productsRouter from './src/server/routes/products.ts';
import ordersRouter from './src/server/routes/orders.ts';
import adminRouter from './src/server/routes/admin.ts';
import uploadRouter from './src/server/routes/upload.ts';
import { UPLOADS_DIR } from './src/server/storage/uploads.ts';
import { db } from './src/server/db.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Parse JSON and URL-encoded bodies (allowing up to 15MB for custom image uploads)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

const isProductionRuntime = process.env.NODE_ENV === 'production';
const distPath = path.resolve(__dirname, 'dist');
// Defensive deny rules: private database/seed paths must never be served as assets.
app.use(['/data', '/.private-data'], (_req: Request, res: Response) => {
  res.status(404).end();
});
if (isProductionRuntime) app.use(express.static(distPath));

// A Neon advisory lock plus a per-instance queue prevents concurrent serverless
// invocations from overwriting one another's product/order snapshots.
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db.beginRequest();
  } catch (error) {
    console.error('Failed to acquire Neon request lock:', error);
    res.status(503).json({ error: 'تعذر الاتصال بقاعدة بيانات المتجر. حاول مرة أخرى.' });
    return;
  }

  let settled = false;
  const release = async (commit: boolean) => {
    if (settled) return;
    settled = true;
    await db.endRequest(commit);
  };
  const originalJson = res.json.bind(res);
  (res as any).json = (body: any) => {
    release(true)
      .then(() => originalJson(body))
      .catch((error: any) => {
        console.error('Neon commit failed:', error);
        if (!res.headersSent) originalJson({ error: 'تعذر حفظ بيانات المتجر. حاول مرة أخرى.' });
      });
    return res;
  };
  res.on('finish', () => {
    if (!settled) release(false).catch((error) => console.error('Neon lock release failed:', error));
  });
  next();
});

if (process.env.NODE_ENV !== 'production') app.use('/uploads', express.static(UPLOADS_DIR));

// Store Settings API are handled by a dedicated route module.
app.use(settingsRouter);

