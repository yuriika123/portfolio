import http from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { pipeline } from 'node:stream/promises';

const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.gif':'image/gif','.mp4':'video/mp4'};

function byteRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2]) || !size) return null;
  const first = match[1] ? Number(match[1]) : null;
  const last = match[2] ? Number(match[2]) : null;
  if ([first, last].some(value => value !== null && !Number.isSafeInteger(value))) return null;
  const start = first === null ? Math.max(0, size - last) : first;
  const end = first === null || last === null ? size - 1 : Math.min(last, size - 1);
  return start < size && start <= end ? { start, end } : null;
}

export async function createPreviewServer(folder, basePath = '/') {
  const root = await realpath(resolve(folder));
  const within = path => path === root || path.startsWith(root + sep);
  return http.createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
      }
      let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (basePath !== '/') {
        if (!pathname.startsWith(basePath)) throw new Error('Outside site base');
        pathname = '/' + pathname.slice(basePath.length);
      }
      let file = await realpath(resolve(root, '.' + pathname));
      if (!within(file)) throw new Error('Outside site');
      if ((await stat(file)).isDirectory()) file = await realpath(resolve(file, 'index.html'));
      if (!within(file)) throw new Error('Outside site');
      const info = await stat(file);
      if (!info.isFile()) throw new Error('Not a file');
      const headers = { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
      const range = request.headers.range ? byteRange(request.headers.range, info.size) : undefined;
      if (range === null) {
        response.writeHead(416, { ...headers, 'Content-Range': `bytes */${info.size}`, 'Content-Length': 0 });
        response.end(); return;
      }
      if (range) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${info.size}`;
      headers['Content-Length'] = range ? range.end - range.start + 1 : info.size;
      response.writeHead(range ? 206 : 200, headers);
      if (request.method === 'HEAD') { response.end(); return; }
      await pipeline(createReadStream(file, range || {}), response);
    } catch {
      if (response.headersSent) { response.destroy(); return; }
      response.writeHead(404, { 'Content-Type': 'text/plain' }); response.end('Not found');
    }
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const { basePath } = await import('./publishing.js');
  const server = await createPreviewServer('dist', basePath);
  server.listen(0, '127.0.0.1', () => console.log(`PREVIEW_URL=http://127.0.0.1:${server.address().port}${basePath}`));
  const parent = Number(process.argv[2]);
  if (parent > 1) setInterval(() => { try { process.kill(parent, 0); } catch { process.exit(0); } }, 2000).unref();
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
}
