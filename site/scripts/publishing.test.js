import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

for (const [url, base] of [['https://yuriika123.github.io/portfolio', '/portfolio/'], ['https://yuta-okuno.me', '/']]) {
  test(`links and SEO work at ${url}`, () => {
    const source = `
      import { applyBasePath, basePath } from ${JSON.stringify(new URL('./publishing.js', import.meta.url).href)};
      import { seoHead } from ${JSON.stringify(new URL('./seo.js', import.meta.url).href)};
      const html = '<a href="/works/sample/" data-work-path="/works/sample/"></a><video poster="/assets/poster.webp"><source src="/assets/movie.mp4"></video><img src="/assets/small.webp" srcset="/assets/small.webp 480w, /assets/big.webp 960w"><script src="/src/main.js"></script>';
      console.log(JSON.stringify({basePath, html:applyBasePath(html), seo:seoHead({title:'Sample',description:'Description',path:'/works/sample/'})}));
    `;
    const result = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', source], { env: { ...process.env, SITE_URL: url }, encoding: 'utf8' }));
    assert.equal(result.basePath, base);
    assert.ok(result.html.includes(`href="${base}works/sample/"`));
    assert.ok(result.html.includes(`src="${base}assets/movie.mp4"`));
    assert.ok(result.html.includes(`srcset="${base}assets/small.webp 480w, ${base}assets/big.webp 960w"`));
    assert.ok(result.html.includes('src="/src/main.js"'));
    assert.ok(result.seo.includes(`href="${url}/works/sample/"`));
    assert.ok(result.seo.includes(`content="${url}/assets/icon.jpg"`));
  });
}
