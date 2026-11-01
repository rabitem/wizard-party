import type * as THREE from 'three';
import type { ICard } from '@shared/domain';
import type { CardTextureTier } from '@/presentation/config/card-render.config';
import { RefCountedLruCache } from './ref-counted-lru-cache';
import {
  getCardTextureTier,
  getCardTextureTierSpec,
  onCardTextureQualityChange,
  refreshCardTextureQuality,
} from './card-texture-quality';

/**
 * Shared card face textures, one per distinct face (type, suit, value) per card theme version
 * and memory tier. A card keeps the same 512x768 face through its whole life (hand, drag,
 * flight, played, collecting) and identical cards (the four Wizards) share it, so a stage change
 * is a cache hit instead of a 2D repaint plus a texture upload.
 */

export interface CardFaceHandle {
  key: string;
  tag: string;
  texture: THREE.CanvasTexture;
}

/** Content key of a face: card ids are not part of it (identical faces share one texture) */
export function getCardFaceKey(card: ICard, themeVersion: string, tier: CardTextureTier): string {
  return [card.type, card.suit ?? '', card.value ?? '', themeVersion, tier].join('|');
}

const cache = new RefCountedLruCache<THREE.CanvasTexture>({
  capacity: () => getCardTextureTierSpec().idleFaceCapacity,
  dispose: (texture) => texture.dispose(),
});

onCardTextureQualityChange(() => cache.forEachValue(refreshCardTextureQuality));

/**
 * Face texture for a card, painted by `paint` on a miss. Call during render; it does not count
 * as a use until retainCardFace (commit) and is released with releaseCardFace (unmount).
 * Idle faces of other theme versions are dropped, so a theme change frees the old deck.
 */
export function peekCardFace(
  card: ICard,
  themeVersion: string,
  paint: (card: ICard) => THREE.CanvasTexture
): CardFaceHandle {
  const tier = getCardTextureTier();
  const key = getCardFaceKey(card, themeVersion, tier);
  cache.purgeIdle((tag) => tag !== themeVersion);
  const texture = cache.peekOrCreate(key, themeVersion, () => paint(card));
  return { key, tag: themeVersion, texture };
}

export function retainCardFace(handle: CardFaceHandle): void {
  cache.retain(handle.key, handle.tag, handle.texture);
}

export function releaseCardFace(handle: CardFaceHandle): void {
  cache.release(handle.key, handle.texture);
}
