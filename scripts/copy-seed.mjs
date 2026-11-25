import { copyFileSync, cpSync, mkdirSync } from 'node:fs';

mkdirSync('dist/data', { recursive: true });
copyFileSync('data/store_database.json', 'dist/data/store_database.json');

// Preserve the source-path image URLs stored in the catalog JSON.
mkdirSync('dist/src/assets', { recursive: true });
cpSync('src/assets/images', 'dist/src/assets/images', { recursive: true });
