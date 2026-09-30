const base = document.body.dataset.base || '/';
// Only public category IDs are needed in the browser, never the source catalog.
const categories = new Set((document.body.dataset.categories || '').split(/\s+/));

if (document.querySelector('#artwork')) {
  import('./sphere.js').catch(error => console.warn('Breathing Sphere: using the still image.', error));
}

const filters = [...document.querySelectorAll('[data-filter]')];
const cards = [...document.querySelectorAll('.work-card')];
const validCategory = value => categories.has(value);
const readFilter = () => {
  const value = new URLSearchParams(location.search).get('filter');
  return validCategory(value) ? value : 'all';
};
const showCategory = (category, updateUrl = false) => {
  if (!validCategory(category)) return;
  filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
  let count = 0;
  cards.forEach(card => {
    card.hidden = category !== 'all' && !card.dataset.categories.split(/\s+/).includes(category);
    if (!card.hidden) count++;
    const link = card.querySelector('[data-work-path]');
    link.href = link.dataset.workPath + (category !== 'all' ? `?from=${category}` : '');
  });
  document.querySelector('.work-count').textContent = `${count}作品`;
  if (updateUrl) {
    const url = new URL(location.href);
    if (category === 'all') url.searchParams.delete('filter');
    else url.searchParams.set('filter', category);
    history.replaceState(null, '', url);
  }
};
if (filters.length) {
  showCategory(readFilter());
  filters.forEach(button => button.addEventListener('click', () => showCategory(button.dataset.filter, true)));
  window.addEventListener('popstate', () => showCategory(readFilter()));
}

const returnLink = document.querySelector('.back-to-works');
if (returnLink) {
  const category = new URLSearchParams(location.search).get('from');
  if (validCategory(category) && category !== 'all') returnLink.href = `${base}?filter=${category}#works`;
}

let youtubeAPI;
function loadYouTubeAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!youtubeAPI) youtubeAPI = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previous?.(); resolve(window.YT); };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = reject;
    document.head.append(script);
  });
  return youtubeAPI;
}

document.querySelectorAll('[data-video-id]').forEach(player => {
  player.querySelector('.player-cover').addEventListener('click', () => {
    const support = document.createElement('div');
    support.className = 'player-support';
    const message = document.createElement('span');
    message.textContent = '再生できない場合は';
    const link = document.createElement('a');
    link.href = `https://www.youtube.com/watch?v=${player.dataset.videoId}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'YouTubeで見る ↗';
    support.append(message, link);
    player.after(support);
    const iframe = document.createElement('iframe');
    const parameters = new URLSearchParams({ autoplay: '1', playsinline: '1', rel: '0', enablejsapi: '1', origin: location.origin });
    iframe.src = `https://www.youtube-nocookie.com/embed/${player.dataset.videoId}?${parameters}`;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.title = `${player.dataset.videoTitle} — YouTube`;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    player.replaceChildren(iframe);
    iframe.focus();
    loadYouTubeAPI().then(YT => {
      new YT.Player(iframe, { events: { onError: event => {
        message.setAttribute('role', 'status');
        if ([101, 150].includes(event.data)) message.textContent = 'この動画は外部サイトでの再生が許可されていません。';
        else if (event.data === 153) message.textContent = 'YouTubeがサイトの情報を確認できず、再生できません。';
        else if (event.data === 100) message.textContent = 'この動画は削除・非公開などにより再生できません。';
        else message.textContent = 'ここでは動画を再生できません。';
      } } });
    }).catch(() => { /* The direct YouTube link remains available if the API cannot load. */ });
  }, { once: true });
});

document.querySelectorAll('.local-player video').forEach(video => {
  const showError = () => {
    video.closest('.local-player').nextElementSibling.querySelector('[data-video-error]').hidden = false;
  };
  video.addEventListener('error', showError);
  video.querySelector('source').addEventListener('error', showError);
});
