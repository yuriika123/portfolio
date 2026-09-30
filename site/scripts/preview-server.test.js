import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPreviewServer } from './preview-server.js';

test('video preview supports full responses, byte ranges, seeking and HEAD', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-http-'));
  const bytes = Buffer.from('0123456789');
  await writeFile(join(directory, 'video.mp4'), bytes);
  await writeFile(join(directory, 'index.html'), 'portfolio');
  await symlink('/etc/hosts', join(directory, 'outside'));
  const server = await createPreviewServer(directory);
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const full = await fetch(`${base}/video.mp4`);
  assert.equal(full.status, 200);
  assert.equal(full.headers.get('content-type'), 'video/mp4');
  assert.equal(full.headers.get('content-length'), '10');
  assert.equal(full.headers.get('accept-ranges'), 'bytes');
  assert.equal(await full.text(), bytes.toString());
  for (const [range, expected, contentRange] of [
    ['bytes=0-1', '01', 'bytes 0-1/10'],
    ['bytes=5-', '56789', 'bytes 5-9/10'],
    ['bytes=-3', '789', 'bytes 7-9/10'],
    ['bytes=8-99', '89', 'bytes 8-9/10'],
    ['bytes=-99', '0123456789', 'bytes 0-9/10'],
  ]) {
    const response = await fetch(`${base}/video.mp4`, { headers: { Range: range } });
    assert.equal(response.status, 206, range);
    assert.equal(response.headers.get('content-range'), contentRange);
    assert.equal(response.headers.get('content-length'), String(expected.length));
    assert.equal(await response.text(), expected);
  }
  for (const range of ['bytes=10-', 'bytes=8-2', 'bytes=-0', 'bytes=-', 'bytes=0-1,5-6', 'bytes=999999999999999999-']) {
    const response = await fetch(`${base}/video.mp4`, { headers: { Range: range } });
    assert.equal(response.status, 416, range);
    assert.equal(response.headers.get('content-range'), 'bytes */10');
    await response.arrayBuffer();
  }
  const head = await fetch(`${base}/video.mp4`, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-length'), '10');
  assert.equal(await head.text(), '');
  const partialHead = await fetch(`${base}/video.mp4`, { method: 'HEAD', headers: { Range: 'bytes=2-4' } });
  assert.equal(partialHead.status, 206);
  assert.equal(partialHead.headers.get('content-length'), '3');
  assert.equal(await partialHead.text(), '');
  for (const path of ['/missing.mp4', '/outside', '/%2e%2e%2fetc%2fhosts']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 404, path);
    await response.arrayBuffer();
  }
  const home = await fetch(base + '/');
  assert.equal(await home.text(), 'portfolio');
});

test('project-site preview serves HTML and video under the repository prefix', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-base-'));
  await writeFile(join(directory, 'index.html'), 'project');
  await writeFile(join(directory, 'video.mp4'), '0123456789');
  const server = await createPreviewServer(directory, '/portfolio/');
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal(await (await fetch(base + '/portfolio/')).text(), 'project');
  const video = await fetch(base + '/portfolio/video.mp4', { headers: { Range: 'bytes=4-6' } });
  assert.equal(video.status, 206);
  assert.equal(await video.text(), '456');
  const outside = await fetch(base + '/video.mp4');
  assert.equal(outside.status, 404);
  await outside.text();
});
