'use client';

import type * as THREE from 'three';
import { CARD_DIMENSIONS } from '@/presentation/config/card-physics';
import { getCardBackTexture } from './card-textures/card-back-texture';
import { getActiveCardTheme } from './card-theme-store';

/**
 * Card texture and material facade. Faces are painted by card-textures/card-face-texture.ts,
 * cached per face by card-textures/card-face-texture-cache.ts and turned into mesh materials by
 * card-textures/card-materials.ts; every card mesh uses the shared geometry of card-geometry.ts.
 */

export { getCardArtRenderer } from './card-textures/card-art-styles';
export {
  buildCardMaterials,
  retainCardMaterials,
  disposeCardMaterials,
  type CardMaterial,
} from './card-textures/card-materials';

// ============== CARD DIMENSIONS ==============

export const CARD_WIDTH = CARD_DIMENSIONS.WIDTH;
export const CARD_HEIGHT = CARD_DIMENSIONS.HEIGHT;
export const CARD_THICKNESS = CARD_DIMENSIONS.THICKNESS;

// ============== CARD BACKS ==============

/** Shared, cached back texture of the selected deck; never dispose it directly */
export function getCurrentCardBackTexture(): THREE.CanvasTexture {
  return getCardBackTexture(getActiveCardTheme().id);
}
