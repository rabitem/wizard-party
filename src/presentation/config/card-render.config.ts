/**
 * Card rendering resources: face texture resolution per memory tier, the shared face cache,
 * texture filtering and the card surface (material) look.
 *
 * Card art is always drawn in the logical 512x768 coordinate space below; a tier only changes
 * the canvas resolution the art is rasterised at.
 */

export type CardTextureTier = 'standard' | 'compact';

/** Coordinate space every card painter draws in (faces and backs) */
export const CARD_FACE_LOGICAL_SIZE = {
  WIDTH: 512,
  HEIGHT: 768,
} as const;

export interface CardTextureTierSpec {
  /** Canvas (and GPU texture) resolution of one card face */
  width: number;
  height: number;
  /**
   * Faces no mounted card uses that stay cached (least recently used are evicted first), so a
   * card moving hand -> flight -> played -> collecting reuses its face instead of repainting it.
   */
  idleFaceCapacity: number;
}

export const CARD_TEXTURE_TIERS: Readonly<Record<CardTextureTier, CardTextureTierSpec>> = {
  /** Desktop and devices with plenty of memory: about 2 MiB per face with mipmaps */
  standard: { width: 512, height: 768, idleFaceCapacity: 12 },
  /** iOS (WebKit canvas memory cap, jetsam) and devices reporting <= 4 GB: about 1.2 MiB per face */
  compact: { width: 384, height: 576, idleFaceCapacity: 6 },
};

export const CARD_MEMORY_TIER = {
  /** navigator.deviceMemory at or below this (GB) selects the compact tier */
  LOW_MEMORY_GB: 4,
} as const;

export const CARD_TEXTURE_QUALITY = {
  /**
   * Anisotropic filtering for card faces and backs (clamped to the renderer's maximum). Played
   * cards lie at grazing angles, where plain trilinear filtering blurs the corner index.
   */
  MAX_ANISOTROPY: 16,
} as const;

/** Card surface: near-matte faces so the overhead spot does not wash the art out */
export const CARD_SURFACE = {
  FACE_ROUGHNESS: 0.72,
  FACE_METALNESS: 0,
  /** Back and edges share one material; a little sheen reads as card stock */
  BACK_ROUGHNESS: 0.55,
  BACK_METALNESS: 0.05,
  /** Colour of the card edges (painted into the back texture's edge swatch) */
  EDGE_COLOR: '#f5f5f0',
} as const;

/**
 * The four thin card edges sample one swatch in the top-left corner of the back texture, so a
 * card needs only two materials (front, back + edges): two draws per pass instead of six.
 */
export const CARD_EDGE_SWATCH = {
  /** Swatch size in logical pixels; the edge UV samples its centre */
  SIZE_PX: 4,
} as const;

/** Vector suit glyphs on card faces (card-textures/suit-glyphs) */
export const SUIT_GLYPH = {
  /** Glyph box relative to the font size the symbol used to be drawn at (font glyphs fill ~90%) */
  EM_SCALE: 0.9,
  /** Size used when the context font carries no px size */
  FALLBACK_FONT_PX: 48,
} as const;
