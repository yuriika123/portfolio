const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const videoPattern = /^[A-Za-z0-9_-]{11}$/;
export function parseYouTubeID(value) {
  if (videoPattern.test(value)) return value;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    let id;
    if (host === 'youtu.be') id = url.pathname.split('/')[1];
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
      id = ['shorts', 'embed', 'live'].includes(url.pathname.split('/')[1]) ? url.pathname.split('/')[2] : url.searchParams.get('v');
    }
    return videoPattern.test(id || '') ? id : null;
  } catch { return null; }
}
export function validImageURL(value) {
  if (!value) return true;
  if (/^\/assets\//.test(value) && !value.includes('..') && !value.includes('\\')) return true;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}
export function isLocalVideo(value) {
  return /^\/assets\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.mp4$/.test(value || '');
}
export const validVideoURL = value => !!parseYouTubeID(value) || isLocalVideo(value);
export function validateCatalog(catalog) {
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.categories) || !Array.isArray(catalog.works)) throw new Error('Unsupported portfolio data.');
  const categoryIDs = new Set();
  for (const category of catalog.categories) {
    if (!idPattern.test(category.id) || category.id === 'all' || !category.label?.trim() || categoryIDs.has(category.id)) throw new Error('Invalid or duplicate category.');
    categoryIDs.add(category.id);
  }
  const workIDs = new Set();
  for (const work of catalog.works) {
    if (!idPattern.test(work.id) || workIDs.has(work.id)) throw new Error('Invalid or duplicate work URL.');
    workIDs.add(work.id);
    if (!Array.isArray(work.categories) || new Set(work.categories).size !== work.categories.length || work.categories.some(id => !categoryIDs.has(id))) throw new Error(`Invalid categories: ${work.title}`);
    if (!validImageURL(work.thumbnailURL)) throw new Error(`Invalid thumbnail: ${work.title}`);
    for (const section of work.sections || []) {
      if (!validImageURL(section.imagePath)) throw new Error(`Invalid image: ${work.title}`);
      if (section.videoURL?.trim() && !validVideoURL(section.videoURL.trim())) throw new Error(`Invalid section video URL: ${work.title}`);
    }
    if (work.published && (!work.title?.trim() || !validVideoURL(work.videoURL) || work.categories.length === 0)) throw new Error(`Title, video and category required: ${work.title}`);
  }
  return catalog;
}
const paragraphs = value => (value || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
export function prepareCatalog(raw) {
  validateCatalog(raw);
  return {
    categories: [{ id: 'all', label: 'All' }, ...raw.categories],
    works: raw.works.filter(w => w.published).map(w => ({
      ...w, videoId: parseYouTubeID(w.videoURL), paragraphs: paragraphs(w.description),
      sections: (w.sections || []).map(s => ({ ...s, videoId: parseYouTubeID(s.videoURL?.trim() || ''), paragraphs: paragraphs(s.body) })),
    })),
  };
}
export const thumbnail = work => work.thumbnailURL || (isLocalVideo(work.videoURL) ? work.videoURL.replace(/\.mp4$/, '-poster.jpg') : `https://i.ytimg.com/vi/${work.videoId}/${work.thumbnailSize || 'maxresdefault'}.jpg`);
