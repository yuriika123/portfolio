import { readFileSync } from 'node:fs';
import { prepareCatalog } from '../src/catalog.js';
export { thumbnail, parseYouTubeID } from '../src/catalog.js';
const catalog = JSON.parse(readFileSync(new URL('../content/portfolio.json', import.meta.url), 'utf8'));
export const { categories, works } = prepareCatalog(catalog);
