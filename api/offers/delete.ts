import app, { initializeApp } from '../../server.ts';

export default async function handler(req: any, res: any) {
  try {
    await initializeApp();
    return app(req, res);
  } catch (error) {
    console.error('Tolip offer-delete API initialization failed:', error);
    if (!res.headersSent) {
      res.status(503).json({ error: 'الخدمة غير جاهزة حاليًا. يرجى المحاولة لاحقًا.' });
    }
  }
}
