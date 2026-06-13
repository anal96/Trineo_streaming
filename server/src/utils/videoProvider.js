/**
 * videoProvider.js — Abstraction Layer for Video Delivery
 *
 * VIDEO_PROVIDER env controls which provider is active.
 * Supported now: 'youtube'
 * Future-ready:  'cloudflare', 'bunny', 'hls'
 *
 * Frontend pages never hardcode any provider-specific URLs.
 * Switch providers in future via .env without touching UI.
 */

export const getVideoProvider = () => process.env.VIDEO_PROVIDER || 'youtube';

/**
 * Build an embed src URL for a given videoId and provider.
 * YouTube: returns a fully-configured embed URL that hides branding,
 * disables related videos, and restricts keyboard shortcuts.
 */
export const getEmbedUrl = (videoId, provider = null) => {
  const p = provider || getVideoProvider();

  switch (p) {
    case 'youtube':
      // rel=0: no related videos | modestbranding=1: minimal YouTube logo
      // controls=1: keep native controls as fallback, we overlay custom UI
      // iv_load_policy=3: no annotations | fs=1: fullscreen allowed
      // disablekb=0: allow keyboard (LMS handles its own keyboard guards)
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&iv_load_policy=3&fs=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(process.env.FRONTEND_ORIGIN || 'http://localhost:5173')}`;

    case 'cloudflare':
      // Future: return `https://iframe.cloudflarestream.com/${videoId}?preload=true`;
      throw new Error('Cloudflare Stream provider not yet configured.');

    case 'bunny':
      // Future: return `https://iframe.mediadelivery.net/embed/${process.env.BUNNY_LIBRARY_ID}/${videoId}`;
      throw new Error('Bunny Stream provider not yet configured.');

    case 'hls':
      // Future: return internal HLS stream path for self-hosted
      return `/api/videos/stream/${videoId}/playlist.m3u8`;

    default:
      throw new Error(`Unknown video provider: ${p}`);
  }
};

/**
 * Returns the thumbnail URL for a video given its provider.
 */
export const getThumbnailUrl = (videoId, provider = null) => {
  const p = provider || getVideoProvider();

  switch (p) {
    case 'youtube':
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    case 'cloudflare':
      return `https://videodelivery.net/${videoId}/thumbnails/thumbnail.jpg`;
    case 'bunny':
      return `https://vz-${process.env.BUNNY_PULL_ZONE}.b-cdn.net/${videoId}/thumbnail.jpg`;
    default:
      return null;
  }
};
