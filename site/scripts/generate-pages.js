import { mkdir, readFile, writeFile, rename, unlink, rmdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { categories, works, thumbnail, parseYouTubeID } from './portfolio-data.js';
import { imageAttributes, prepareImages, imageURL } from './images.js';
import { applyBasePath, basePath } from './publishing.js';
import { isLocalVideo } from '../src/catalog.js';
import { seoHead, siteURL, homeDescription } from './seo.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
async function atomicWrite(path, text) {
  const temporary = `${path}.editor-tmp`;
  await writeFile(temporary, text);
  await rename(temporary, path);
}
const manifestPath = resolve(root, 'works/.generated-pages.json');
let previousIDs = [];
try { previousIDs = JSON.parse(await readFile(manifestPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const path = work => `/works/${work.id}/`;
const category = work => work.categories.map(id => categories.find(item => item.id === id).label).join(' / ');
await prepareImages(['/assets/icon.jpg', ...works.flatMap(work => [thumbnail(work), ...work.sections.flatMap(section => [section.imagePath, ...(isLocalVideo(section.videoURL) ? [section.videoURL.replace(/\.mp4$/, '-poster.jpg')] : [])])])]);
const videoPlayer = (url, title, portrait, poster, priority = false) => {
  if (isLocalVideo(url)) return `<div class="video-player local-player${portrait ? ' portrait' : ''}"><video controls playsinline preload="none" poster="${escape(imageURL(poster || url.replace(/\.mp4$/, '-poster.jpg')))}" aria-label="${escape(title)}"><source src="${escape(url)}" type="video/mp4" />動画を再生するには、<a href="${escape(url)}">動画ファイルを開いてください</a>。</video></div><div class="player-support"><span role="status" data-video-error hidden>動画を再生できません。</span><a href="${escape(url)}" target="_blank" rel="noopener">動画ファイルを開く ↗</a></div>`;
  const id = parseYouTubeID(url);
  return `<div class="video-player${portrait ? ' portrait' : ''}" data-video-id="${id}" data-video-title="${escape(title)}"><button class="player-cover" type="button" aria-label="${escape(title)} を再生"><img ${imageAttributes(poster || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, '(max-width: 767px) calc(100vw - 40px), 1200px')} alt="" ${priority ? 'fetchpriority="high"' : 'loading="lazy"'} /><span class="play-label"><span aria-hidden="true">▷</span> 映像を再生</span></button></div>`;
};
const videoLink = work => work.videoId ? `<a class="youtube-link" href="https://www.youtube.com/watch?v=${work.videoId}" target="_blank" rel="noopener noreferrer">YouTubeで見る ↗</a>` : '';
const card = work => `
  <article class="work-card" data-categories="${work.categories.join(' ')}">
    <a class="work-link" href="${path(work)}" data-work-path="${path(work)}" aria-label="${escape(work.title)} — 作品を見る">
      <div class="work-artwork${work.portrait ? ' portrait' : ''}">
        <img ${imageAttributes(thumbnail(work), '(max-width: 767px) calc(100vw - 40px), (max-width: 900px) 45vw, 42vw')} alt="" loading="lazy" decoding="async" />
        <span class="work-view" aria-hidden="true">View work <span>↗</span></span>
      </div>
      <div class="work-caption">
        <h3>${escape(work.title)}</h3>
        <p class="work-subtitle">${escape(work.subtitle)}</p>
        <p class="work-summary">${escape(work.summary)}</p>
      </div>
    </a>
  </article>`;
const gallery = `<section class="works-section" id="works" aria-labelledby="works-title">
  <div class="works-heading"><h2 id="works-title">Works</h2><span class="work-count" aria-live="polite" aria-atomic="true">${works.length}作品</span></div>
  <div class="work-filters" role="group" aria-label="作品のカテゴリーで絞り込む">
    ${categories.map((item, i) => `<button type="button" data-filter="${item.id}" aria-pressed="${i === 0}">${escape(item.label)}</button>`).join('\n    ')}
  </div>
  <div class="works-grid">${works.map(card).join('\n')}</div>
</section>`;
const template = async (name, values) => (await readFile(resolve(root, 'templates', name), 'utf8')).replace(/\{\{(\w+)\}\}/g, (_, key) => {
  if (!(key in values)) throw new Error(`Missing template value: ${key}`);
  return values[key];
});
const header = await template('header.html', {});
const footer = await template('footer.html', {});
const categoryIDs = categories.map(category => category.id).join(' ');
const home = await template('home.html', { header, footer, basePath, categoryIDs, gallery, heroImage: imageAttributes('/assets/icon.jpg', '(max-width: 767px) 100vw, 700px'), seo: seoHead({ title: 'Yuta Okuno — Portfolio', description: homeDescription, image: imageURL('/assets/icon.jpg') }) });
await atomicWrite(resolve(root, 'index.html'), applyBasePath(home));
await mkdir(resolve(root, 'public'), { recursive: true });
const urls = ['/', ...works.map(work => path(work))];
await atomicWrite(resolve(root, 'public/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(path => `  <url><loc>${escape(siteURL + path)}</loc></url>`).join('\n')}\n</urlset>\n`);
await atomicWrite(resolve(root, 'public/robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteURL}/sitemap.xml\n`);


for (const [i, work] of works.entries()) {
  const previous = works[i - 1];
  const next = works[i + 1];
  const metadata = [
    ['Category', category(work)], ...(work.projectType ? [['Project', work.projectType]] : []), ...(work.role ? [['Role', work.role]] : []),
    ...(work.tool ? [['Tools', work.tool]] : []), ...(work.input ? [['Input', work.input]] : []),
    ...(work.music ? [['Music', work.music]] : []), ...(work.year ? [['Year', work.year]] : []),
    ...(work.metadata || []).filter(item => item.label.trim() && item.value.trim()).map(item => [item.label, item.value]),
  ];
  const extra = (work.sections || []).map(section => {
    const heading = section.title.trim() ? `<h2>${escape(section.title)}</h2>` : '';
    const image = section.imagePath ? `<figure class="process-image"><img alt="${escape(section.imageCaption || section.title || `${work.title} の制作過程`)}" ${imageAttributes(section.imagePath, '(max-width: 767px) calc(100vw - 40px), 720px', true)} loading="lazy" decoding="async" />${section.imageCaption ? `<figcaption>${escape(section.imageCaption)}</figcaption>` : ''}</figure>` : '';
    const videoTitle = section.title.trim() || `${work.title} 関連動画`;
    const video = section.videoURL?.trim() ? `<div class="section-video">${videoPlayer(section.videoURL.trim(), videoTitle, section.videoPortrait)}${section.videoId ? `<a class="youtube-link" href="https://www.youtube.com/watch?v=${section.videoId}" target="_blank" rel="noopener noreferrer">YouTubeで見る ↗</a>` : ''}</div>` : '';
    const copy = section.paragraphs.map(text => `<p>${escape(text)}</p>`).join('');
    return `<section class="project-section">${heading}${image}${video}${copy}</section>`;
  }).join('');
  const content = `<main class="project-page">
  <div class="project-breadcrumb"><a class="back-to-works" href="/#works">← Works</a></div>
  <header class="project-intro"><p class="eyebrow">${escape(category(work))}${work.projectType ? ` · ${escape(work.projectType)}` : ''}</p><h1>${escape(work.title)}</h1><p class="project-lead">${escape(work.summary || work.subtitle)}</p></header>
  ${videoPlayer(work.videoURL, work.title, work.portrait, thumbnail(work), true)}
  <div class="project-description"><div class="project-title"><h2>制作について</h2><p class="project-subtitle">${escape(work.subtitle)}</p></div>
    <div class="project-copy">${work.paragraphs.map(text => `<p>${escape(text)}</p>`).join('')}
      <dl class="project-metadata">${metadata.map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>
      ${videoLink(work)}
    </div></div>${extra}
  <nav class="project-pagination" aria-label="前後の作品">
    ${previous ? `<a href="${path(previous)}"><span>前の作品</span><strong>← ${escape(previous.title)}</strong></a>` : '<span></span>'}
    ${next ? `<a class="next-work" href="${path(next)}"><span>次の作品</span><strong>${escape(next.title)} →</strong></a>` : '<a class="next-work" href="/#works"><span>作品一覧へ</span><strong>Works →</strong></a>'}
  </nav>
</main>`;
  const html = await template('work.html', { header, footer, basePath, categoryIDs, content,
    seo: seoHead({ title: `${work.title} — Yuta Okuno`, description: `${work.summary || work.subtitle || work.title} — Yuta Okuno（奥野 雄太 / yuriika）の作品。`, path: path(work), image: imageURL(thumbnail(work)), work }),
  });
  const folder = resolve(root, 'works', work.id);
  await mkdir(folder, { recursive: true });
  await atomicWrite(resolve(folder, 'index.html'), applyBasePath(html));
}
for (const id of previousIDs) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || works.some(work => work.id === id)) continue;
  const folder = resolve(root, 'works', id);
  try {
    const file = resolve(folder, 'index.html');
    const text = await readFile(file, 'utf8');
    if (text.includes('<!-- Generated by Portfolio Editor -->')) {
      await unlink(file);
      try { await rmdir(folder); } catch (error) { if (!['ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error; }
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
await mkdir(resolve(root, 'works'), { recursive: true });
await atomicWrite(manifestPath, JSON.stringify(works.map(work => work.id)) + '\n');
console.log(`Generated gallery and ${works.length} static work pages.`);
