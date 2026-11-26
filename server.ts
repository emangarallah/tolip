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
import { isReadOnlyStoreRequest } from './src/server/request-mode.ts';

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

// A shared advisory lock lets safe reads run concurrently. Mutations keep an
// exclusive lock so the single JSONB store cannot lose concurrent updates.
app.get('/api/health', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    await db.checkHealth();
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Store health check failed:', error);
    res.status(503).json({ status: 'unavailable' });
  }
});

app.use(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.path.startsWith('/api/')) {
    next();
    return;
  }

  const readOnly = isReadOnlyStoreRequest(req.method, req.path);
  let endRequest: (() => Promise<void>) | null = null;

  try {
    endRequest = await db.beginRequest(readOnly);
  } catch (error) {
    console.error('Failed to acquire Neon request lock:', error);
    res.setHeader('Retry-After', '2');
    res.status(503).json({ error: 'المتجر مشغول مؤقتًا. يرجى إعادة المحاولة بعد قليل.' });
    return;
  }

  let settled = false;
  const release = async () => {
    if (settled) return;
    settled = true;
    await endRequest?.();
  };

  const originalJson = res.json.bind(res);
  (res as any).json = (body: any) => {
    if (settled) return originalJson(body);

    release()
      .then(() => originalJson(body))
      .catch((error: any) => {
        console.error('Neon request finalization failed:', error);
        if (!res.headersSent) {
          res.statusCode = 503;
          res.setHeader('Retry-After', '2');
          originalJson({
            error: readOnly
              ? 'تعذر إكمال الطلب حاليًا. يرجى إعادة المحاولة.'
              : 'تعذر حفظ بيانات المتجر. يرجى إعادة المحاولة.',
          });
        }
      });
    return res;
  };

  const releaseOnResponseEnd = () => {
    if (!settled) {
      release().catch((error) => console.error('Neon lock release failed:', error));
    }
  };
  res.once('finish', releaseOnResponseEnd);
  res.once('close', releaseOnResponseEnd);
  next();
});
if (process.env.NODE_ENV !== 'production') app.use('/uploads', express.static(UPLOADS_DIR));

// Store Settings API are handled by a dedicated route module.
// API route modules, mounted in the same order as the original endpoints.
app.use(settingsRouter);
app.use(categoriesRouter);
app.use(offersRouter);
app.use(productsRouter);
app.use(ordersRouter);
app.use(adminRouter);
app.use(uploadRouter);

// 7. Vite Integration (SPA & Static Serving)
// ==========================================
let initialization: Promise<void> | null = null;
export function initializeApp(): Promise<void> {
  if (!initialization) initialization = db.initializePersistentStore();
  return initialization;
}

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

async function startServer() {
  if (isProduction) await initializeApp();
  else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }
  app.listen(PORT, '0.0.0.0', () => {
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
