import { readFileSync, existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { imageSize } from 'image-size';

const publicFile = path => new URL(`../public${path}`, import.meta.url);
const manifestFile = new URL('../.image-variants.json', import.meta.url);
let variants = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : {};
const raster = path => /^\/assets\/.*\.(png|jpe?g|webp)$/i.test(path);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export async function prepareImages(paths) {
  const current = {};
  await mkdir(publicFile('/assets/optimized/'), { recursive: true });
  for (const path of new Set(paths.filter(Boolean))) {
    if (!raster(path)) continue;
    const source = readFileSync(publicFile(path));
    const metadata = await sharp(source).metadata();
    // Preserve animation; SVG/GIF are also left intact.
    if (metadata.pages > 1) continue;
    const dimensions = await sharp(source).rotate().toBuffer({ resolveWithObject: true });
    const { width, height } = dimensions.info;
    const hash = createHash('sha256').update(source).update('webp-q82-v1').digest('hex').slice(0, 20);
    const widths = [...new Set([480, 960, 1440].map(w => Math.min(w, width)))];
    const outputs = [];
    for (const w of widths) {
      const output = `/assets/optimized/${hash}-${w}.webp`;
      if (!existsSync(publicFile(output))) await sharp(source).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 82 }).toFile(publicFile(output).pathname);
      outputs.push({ path: output, width: w });
    }
    current[path] = { width, height, outputs };
  }
  variants = current;
  await writeFile(manifestFile, JSON.stringify(current));
}
export function imageOutputs(path) { return variants[path]?.outputs.map(o => o.path) || [path]; }
export function imageURL(path) { return variants[path]?.outputs.at(-1).path || path; }
export function imageAttributes(path, sizes = '100vw', reserveRemote = false) {
  const variant = variants[path];
  if (variant) return `src="${escape(imageURL(path))}" srcset="${variant.outputs.map(o => `${o.path} ${o.width}w`).join(', ')}" sizes="${escape(sizes)}" width="${variant.width}" height="${variant.height}"`;
  if (!path.startsWith('/assets/')) {
    if (reserveRemote) return `src="${escape(path)}" style="aspect-ratio: 4 / 3; object-fit: contain"`;
    const standard = path.endsWith('/hqdefault.jpg');
    return `src="${escape(path)}" width="${standard ? 480 : 1280}" height="${standard ? 360 : 720}"`;
  }
  const { width, height } = imageSize(readFileSync(publicFile(path)));
  if (!width || !height) throw new Error(`Image dimensions unavailable: ${path}`);
  return `src="${escape(path)}" width="${width}" height="${height}"`;
}
