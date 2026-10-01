import { readFileSync } from 'node:fs';
const settings = JSON.parse(readFileSync(new URL('../content/publishing.json', import.meta.url), 'utf8'));
const configuredURL = (process.env.SITE_URL || settings.siteURL).replace(/\/+$/, '');
// Pages may report HTTP while the custom domain's certificate is provisioning.
export const siteURL = process.env.GITHUB_PAGES === 'true'
  ? configuredURL.replace(/^http:\/\//, 'https://')
  : configuredURL;
const parsed = new URL(siteURL);
if (parsed.protocol !== 'https:' || parsed.search || parsed.hash || parsed.username || parsed.password) throw new Error('Publishing URL must be an HTTPS site URL.');
export const basePath = parsed.pathname.replace(/\/+$/, '') + '/';
export function publicPath(path) { return basePath + path.replace(/^\//, ''); }
export function applyBasePath(html) {
  return html.replace(/\b(href|src|poster|data-work-path)="(\/(?!\/)[^"]*)"/g, (match, attribute, path) => path.startsWith('/src/') ? match : `${attribute}="${publicPath(path)}"`)
    .replace(/\bsrcset="([^"]*)"/g, (_, entries) => `srcset="${entries.split(',').map(entry => entry.trim().replace(/^\//, basePath)).join(', ')}"`);
}
