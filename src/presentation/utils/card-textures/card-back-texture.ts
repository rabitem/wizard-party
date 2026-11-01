'use client';

/**
 * Card back textures, one shared texture per card theme id.
 * Every face-down card in the scene samples the same texture, so a back is
 * painted once per theme instead of once per card mesh.
 */

import * as THREE from 'three';
import { getCardBackDesign } from '@/presentation/components/settings/card-back-presets';
import { CARD_EDGE_SWATCH, CARD_FACE_LOGICAL_SIZE, CARD_SURFACE } from '@/presentation/config/card-render.config';
import { drawCardBack } from './card-back-drawing';
import { applyCardTextureQuality, onCardTextureQualityChange, refreshCardTextureQuality } from './card-texture-quality';

/** Same canvas size as the card face textures */
export const CARD_BACK_TEXTURE_WIDTH = CARD_FACE_LOGICAL_SIZE.WIDTH;
export const CARD_BACK_TEXTURE_HEIGHT = CARD_FACE_LOGICAL_SIZE.HEIGHT;

const SHARED_BACK_FLAG = 'sharedCardBack';
const backTextureCache = new Map<string, THREE.CanvasTexture>();

onCardTextureQualityChange(() => backTextureCache.forEach(refreshCardTextureQuality));

/**
 * The card edges sample this corner swatch (see card-geometry.ts), so back and edges share one
 * material. It covers a few pixels in the outermost corner of the back, where the edge is.
 */
export function paintCardEdgeSwatch(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.fillStyle = CARD_SURFACE.EDGE_COLOR;
  ctx.fillRect(0, 0, CARD_EDGE_SWATCH.SIZE_PX, CARD_EDGE_SWATCH.SIZE_PX);
  ctx.restore();
}

/** Paints a new (uncached) back texture for a card theme id */
function createCardBackTexture(themeId?: string | null): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_BACK_TEXTURE_WIDTH;
  canvas.height = CARD_BACK_TEXTURE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    drawCardBack(ctx, canvas.width, canvas.height, getCardBackDesign(themeId));
    paintCardEdgeSwatch(ctx);
  }
  const texture = new THREE.CanvasTexture(canvas);
  applyCardTextureQuality(texture);
  return texture;
}

/**
 * Shared back texture for a card theme id. Do not dispose it from a component:
 * disposeCardMaterials skips it (see isSharedCardBackTexture).
 */
export function getCardBackTexture(themeId?: string | null): THREE.CanvasTexture {
  const key = getCardBackDesign(themeId) === getCardBackDesign(null) ? 'default' : (themeId as string);
  let texture = backTextureCache.get(key);
  if (!texture) {
    texture = createCardBackTexture(themeId);
    texture.userData[SHARED_BACK_FLAG] = true;
    backTextureCache.set(key, texture);
  }
  return texture;
}

export function isSharedCardBackTexture(texture: THREE.Texture | null | undefined): boolean {
  return Boolean(texture?.userData?.[SHARED_BACK_FLAG]);
}
