import { siteURL, publicPath } from './publishing.js';
export { siteURL };
export const siteName = 'Yuta Okuno';
export const homeDescription = '映像・音・光・コードを垣根なく組み合わせる。映像・音楽作品を制作するYuta Okuno（奥野 雄太 / yuriika）のポートフォリオ。モーションデザイン、音楽、クリエイティブコーディングの作品を紹介しています。';
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const person = {
  '@type': 'Person', '@id': `${siteURL}/#person`, name: 'Yuta Okuno',
  alternateName: ['奥野 雄太', '奥野雄太', 'yuriika', 'yuriika123'], url: `${siteURL}/`,
  sameAs: ['https://www.instagram.com/yuriika123', 'https://www.youtube.com/@yuriika123', 'https://x.com/yuriika123x', 'https://soundcloud.com/yuriika123', 'https://github.com/yuriika123'],
};
export function seoHead({ title, description, path = '/', image = '/assets/icon.jpg', work }) {
  const url = `${siteURL}${path}`;
  const imageURL = new URL(image.startsWith('/') ? publicPath(image) : image, `${siteURL}/`).href;
  const graph = [person, { '@type': 'WebSite', '@id': `${siteURL}/#website`, name: siteName, alternateName: ['奥野 雄太のポートフォリオ', 'yuriika'], url: `${siteURL}/`, inLanguage: 'ja', publisher: { '@id': person['@id'] } },
    { '@type': work ? 'WebPage' : 'CollectionPage', '@id': `${url}#page`, url, name: title, description, inLanguage: 'ja', isPartOf: { '@id': `${siteURL}/#website` }, ...(work ? { mainEntity: { '@id': `${url}#work` } } : { about: { '@id': person['@id'] } }) }];
  if (work) graph.push({ '@type': 'CreativeWork', '@id': `${url}#work`, name: work.title, description: work.summary || work.subtitle || work.title, url, image: imageURL, creator: { '@id': person['@id'] }, inLanguage: 'ja' });
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  return `<title>${escape(title)}</title>
  <meta name="description" content="${escape(description)}" />
  <link rel="canonical" href="${escape(url)}" />
  <meta name="author" content="Yuta Okuno（奥野 雄太）" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${siteName}" />
  <meta property="og:locale" content="ja_JP" />
  <meta property="og:title" content="${escape(title)}" />
  <meta property="og:description" content="${escape(description)}" />
  <meta property="og:url" content="${escape(url)}" />
  <meta property="og:image" content="${escape(imageURL)}" />
  <meta property="og:image:alt" content="${escape(work?.title || 'Breathing Sphere — Yuta Okuno')}" />
  <meta name="twitter:card" content="summary_large_image" />
  <script type="application/ld+json">${json}</script>`;
}
