/**
 * Static assets served from our own origin. Loading them from third-party CDNs would send every
 * player's IP address to that CDN without consent (GDPR), so keep new assets in /public as well.
 */
export const TABLE_TEXTURE_URLS = {
  /** Prototype grid texture from pmndrs/drei-assets (Kenney, CC0). The wood is procedural. */
  FELT: '/textures/prototype/light-texture_12.png',
} as const;

/**
 * 3D text (troika) resolves fallback fonts for characters its font lacks, e.g. emoji or CJK in
 * player names. Those files are fetched through our own proxy route instead of jsDelivr directly.
 */
export const UNICODE_FONTS = {
  PROXY_PATH: '/vendor/unicode-fonts',
  UPSTREAM_URL: 'https://cdn.jsdelivr.net/gh/lojjic/unicode-font-resolver@v1.0.1/packages/data',
} as const;
