import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist/data', { recursive: true });
copyFileSync('data/store_database.json', 'dist/data/store_database.json');
