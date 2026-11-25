import { cpSync, mkdirSync } from 'node:fs';

// The store database seed stays outside dist so it cannot be deployed as a public asset.
// Vercel includes data/store_database.json only in the API function bundle.

// Preserve the source-path image URLs stored in the catalog JSON.
mkdirSync('dist/src/assets', { recursive: true });
cpSync('src/assets/images', 'dist/src/assets/images', { recursive: true });
