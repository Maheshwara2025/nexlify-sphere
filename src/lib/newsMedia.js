// Shared NS News attachment validation and safe YouTube rendering.
// News is always text-first; media augments the same article, not a separate category.
export const NEWS_IMAGE_LIMIT = 8 * 1024 * 1024;
export const NEWS_VIDEO_LIMIT = 40 * 1024 * 1024;
export const NEWS_EXTRA_PHOTO_LIMIT = 6;

const extensions = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm'
});

/** @param {File|{type:string,size:number}} file @param {'image'|'video'} kind */
export function checkNewsFile(file, kind) {
  const types = kind === 'image'
    ? ['image/jpeg', 'image/png', 'image/webp']
    : ['video/mp4', 'video/webm'];
  const limit = kind === 'image' ? NEWS_IMAGE_LIMIT : NEWS_VIDEO_LIMIT;
  if (!file || !types.includes(file.type)) {
    throw new Error(kind === 'image'
      ? 'ఫోటో JPG, PNG లేదా WebP మాత్రమే అప్‌లోడ్ చేయండి.'
      : 'వీడియో MP4 లేదా WebM ఫార్మాట్‌లో ఉండాలి.');
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > limit) {
    throw new Error(kind === 'image'
      ? 'ఒక్కో ఫోటో 8 MB లోపు ఉండాలి.'
      : 'వీడియో 40 MB లోపు ఉండాలి. పెద్ద వీడియోకు YouTube లింక్ ఉపయోగించండి.');
  }
  return extensions[file.type];
}

/** @param {string} bucket @param {string} kind @param {File} file */
export function newNewsObjectPath(bucket, kind, file) {
  const ext = checkNewsFile(file, kind === 'videos' ? 'video' : 'image');
  if (!['news-images', 'ns-news-videos'].includes(bucket)) {
    throw new Error('Invalid news media bucket.');
  }
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw new Error('Secure file identifiers unavailable.');
  }
  return 'articles/' + kind + '/' + crypto.randomUUID() + '.' + ext;
}

/** Extract a strict YouTube video ID to avoid loading untrusted iframe origins. */
export function getYouTubeEmbedUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    let id = '';
    if (host === 'youtu.be') {
      id = url.pathname.split('/')[1] || '';
    } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(host)) {
      if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
      else if (/^\/(shorts|embed|live)\//.test(url.pathname)) id = url.pathname.split('/')[2] || '';
    }
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    return 'https://www.youtube-nocookie.com/embed/' + id;
  } catch {
    return null;
  }
}

export function hasNewsVideo(article) {
  return Boolean(article?.video_url || getYouTubeEmbedUrl(article?.youtube_url || ''));
}
