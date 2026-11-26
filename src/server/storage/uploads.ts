import fs from 'fs';
import path from 'path';

// Local development uploads are stored outside the source tree.
export const UPLOADS_DIR = path.resolve(process.cwd(), 'public/uploads');

if (process.env.NODE_ENV !== 'production' && !fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
