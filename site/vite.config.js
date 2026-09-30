import { basePath } from './scripts/publishing.js';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { imageOutputs } from './scripts/images.js';
import { isLocalVideo } from './src/catalog.js';
import { thumbnail } from './scripts/portfolio-data.js';
import { works } from './scripts/portfolio-data.js';

const local = path => fileURLToPath(new URL(path, import.meta.url));
// An explicit asset list keeps drafts and unused editor imports out of the deployment.
const assets = new Set(['/assets/favicon.png', '/sitemap.xml', '/robots.txt', ...imageOutputs('/assets/icon.jpg')]);
for (const work of works) {
  for (const path of [thumbnail(work), ...work.sections.map(section => section.imagePath), ...work.sections.filter(section => isLocalVideo(section.videoURL)).map(section => section.videoURL.replace(/\.mp4$/, '-poster.jpg'))]) {
    if (path?.startsWith('/assets/')) imageOutputs(path).forEach(output => assets.add(output));
  }
  for (const path of [work.videoURL, ...work.sections.map(section => section.videoURL)]) {
    if (isLocalVideo(path)) assets.add(path);
  }
}
export default defineConfig(({ command }) => ({
  base: basePath,
  publicDir: command === 'build' ? false : 'public',
  plugins: [{
    name: 'published-assets',
    apply: 'build',
    generateBundle() {
      for (const path of assets) {
        this.emitFile({ type: 'asset', fileName: path.slice(1), source: readFileSync(local(`./public${path}`)) });
      }
    },
  }],
  build: {
    rollupOptions: {
      input: { main: local('./index.html'), ...Object.fromEntries(works.map(work => [work.id, local(`./works/${work.id}/index.html`)])) },
    },
  },
}));
